# runtime-dependency-modules-plugin
# Table Of Contents
* [Introduction](#introduction)
* [Installation](#installation)
* [Usage](#usage)
* [Notes](#notes)
* [Contribution](#contribution)
## Introduction

This module was created to help those who want to know what modules are really used by their front end application at the runtime.
Knowing that node_modules is the heaviest object in the universe, this plugin will copy ONLY the modules that the application need.


## Installation
The webpack module is needed only as a dev dependency as it will not be used during production.

````
npm i -D runtime-dependency-modules-plugin
````

Worth to mention that you need to make a custom webpack config to add a plugin for the compilation process.
Please refer to the documentation related to your library / framework on how to make a custom webpack config.

## Usage
As simple as it may look : 
```
const runTimeDependencyModulesPlugin = require('runtime-dependency-modules-plugin');

module.exports = {
    plugins: [
        new runTimeDependencyModulesPlugin({
            destination : 'dependency-modules'
        })
    ]
};
```
You can also add some log if you need to check which file is copied from node_modules into your destination module: 
```
new runTimeDependencyModulesPlugin({
    destination : 'dependency-modules',
    log : {
        filePath: 'runtime-dependency-modules-plugin.log',
        level: 'info'
    }
})
```
At the end of your build, you will find a file at the root of the project that will contains all what the plugin did.

## Notes
This module was highly inspired from the sonatype module [sonatype-nexus-community](https://github.com/sonatype-nexus-community/copy-modules-webpack-plugin)

The sonatype module does not support AOT build therefore I decided to change the behavior of the plugin and seeing all the changes that was done, it was better to create a separate project.

## Contribution

Feel free to contibute to this project as I have no plan for it except using it as is.