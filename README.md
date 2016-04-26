# How To Run
* Download all files [here](https://github.com/ncaron/Capital-Coffee/archive/master.zip)
* Open index.html in your browser
* You can also click [here](http://ncaron.github.io/Capital-Coffee/) to access the site without downloading

# How To Use Build Tools (Grunt)
* Install [node.js](http://nodejs.org)
* Using the command line, do the following:
  * Update npm: `npm update -g npm`
  * Install Grunt: `npm install -g grunt-cli`
  * Go to project's root directory
  * Install project's dependencies:
    * load-grunt-tasks: `npm install --save-dev load-grunt-tasks`
	* uglify: `npm install grunt-contrib-uglify --save-dev`
	* cssmin: `npm install grunt-contrib-cssmin --save-dev`
	* htmlmin: `npm install grunt-contrib-htmlmin --save-dev`
  * Run grunt with `grunt` or `grunt X` where `x` is the only plugin you wish to run

# License
This repository is covered under the [MIT License](LICENSE)