const fs = require('fs-extra');
const path = require('path');
var log4js = require('log4js');
var rimraf = require("rimraf");


module.exports = class RunTimeDependencyModulesPlugin {
  
  constructor(options) {
    this.destination = path.resolve(process.cwd(), options.destination);

    if (options.log) {
      if (this.configureLogger(options.log.filePath, options.log.level))
        this.logger = log4js.getLogger('rdmp');
    }
  }

  configureLogger(filePath, logLevel) {
    if (filePath == null){
      filePath = './runtime-dependency-modules-plugin.log';
    }

    if (logLevel == null) {
      logLevel = "info"
    }
    
    log4js.configure({
      appenders: {
        rdmp : { type: 'file', filename: filePath }
      },
      categories : { default: { appenders: ['rdmp'], level: logLevel } }
    });
    return true;
  }

  log(type, message, obj) {
    
    if (obj == null) {
      obj = "";
    }

    if (this.logger) {
      switch (type) {
        case 'error': this.logger.error(message, obj);
        case 'warn': this.logger.warn(message, obj);
        case 'debug': this.logger.debug(message, obj);
        case 'trace': this.logger.trace(message, obj);
        case 'fatal': this.logger.fatal(message, obj);
        default: this.logger.info(message, obj);
      }
    }
  }

  apply(compiler) {
    compiler.hooks.beforeRun.tap('RunTimeDependencyModulesPlugin', this.deleteDependencyModuleDirectory.bind(this));
    compiler.hooks.emit.tapPromise('RunTimeDependencyModulesPlugin', this.handleEmit.bind(this));
  }

  deleteDependencyModuleDirectory() {
    rimraf(path.resolve(__dirname, this.destination), err => {
      if (err) {
        this.log('error','dependency-modules can\'t be deleted!', err)
      }
      else {
        this.log('info', 'dependency-modules has been deleted!');
      }
    } );
    
  }

  handleEmit(compilation) {
    const me = this;
    let fileDependencies = new Set();

    compilation.modules.forEach( module => (module.buildInfo.fileDependencies ||[])
        .forEach(fileDependencies.add.bind(fileDependencies)));

    const packageJsons = this.findPackageJsonPaths(fileDependencies);
    
    return Promise.all([...fileDependencies,...packageJsons].map(function(file) {
      const relativePath = replaceParentDirReferences(path.relative(process.cwd(), file)),
          destPath = path.join(me.destination, relativePath),
          destDir = path.dirname(destPath);
          me.log('info', 'treating file : ', file);

      fs.exists(file, function(exists) {

        var destinationDirCreated = fs.mkdirs(destDir)
                                        .catch(err => { me.log('error', 'error occured while creating dependency-module folder', destDir, err);});

        if (exists) {
          me.log('info', 'file exists!');
          me.log('info', 'copy file ...');
          
          destinationDirCreated.then(() => fs.copy(file, destPath, { overwrite: true })
                                          .catch(err => me.log('error','error occured while copying file ', dirFile, err ) ));
          
        } else {
          const dir = path.dirname(file);

          me.log('info', 'file does not exist!');
          me.log('info', 'read directory : ', dir);

          fs.readdir(dir, function(err, files) {

            if (err) {
              me.log('error', 'An error occured while reading the directory. err: ', err);
              return;
            }

            me.log('info', 'copy all files inside directory');
            files.forEach(file => {
              const dirFile = path.join(dir, file);
              me.log('info', 'copy file : ', dirFile);
              destinationDirCreated.then(() => fs.copy(dirFile, destPath, { overwrite: true })
                                    .catch(err => me.log('error','error occured while copying file ', dirFile, err ) ));
            });
          });
        }
        return true;
      });
      return true;
    }));
  }

  findPackageJsonPaths(filePaths) {
    const packageJsons = new Set(),

        // dirs for which a package.json search has already been conducted.
        // If the package.json search algo ends up in one of these dirs it knows it can stop searching
        dirsAlreadySearchedForPackageJson = new Set();

    // find associated package.json files for each fileDependency
    filePaths.forEach(function(file) {
      let dirPath = path.dirname(file),
          oldDirPath;

      // until we reach the root
      while (dirPath !== oldDirPath) {
        if (dirsAlreadySearchedForPackageJson.has(dirPath)) {
          return;
        }
        else {
          dirsAlreadySearchedForPackageJson.add(dirPath);

          const packageJsonPath = path.join(dirPath, 'package.json');

          if (fs.pathExistsSync(packageJsonPath)) {
            packageJsons.add(packageJsonPath);
            return;
          }
          else {
            // loop again to check next parent dir
            oldDirPath = dirPath;
            dirPath = path.dirname(dirPath);
          }
        }
      }
    });

    return packageJsons;
  }
};

/**
 * Go through the path and replace all `..` parts with `__..__`
 */
function replaceParentDirReferences(inputPath) {
  const pathParts = inputPath.split(path.sep);

  return pathParts.map(part => part === '..' ? '__..__' : part).join(path.sep);
}

