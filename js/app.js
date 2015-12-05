/* ===== Map ===== */

var map;

var mapOptions = {
	mapTypeControlOptions: {position: google.maps.ControlPosition.TOP_RIGHT}
}

map = new google.maps.Map(document.getElementById('map'), mapOptions);


/* ===== Model ===== */

// Places
// TODO: Change the places
var places = [
	{
		name: 'Byward Market',
		latitude: 45.427655,
		longitude: -75.692391
	},
	{
		name: 'Parliament of Canada',
		latitude: 45.425118,
		longitude: -75.699917
	},
	{
		name: 'University of Ottawa',
		latitude: 45.423126,
		longitude: -75.683108
	},
	{
		name: 'Canadian War Museum',
		latitude: 45.417107,
		longitude: -75.716942
	},
	{
		name: 'National Gallery of Canada',
		latitude: 45.429537,
		longitude: -75.698903
	}
];

var Place = function(data) {
	this.name = ko.observable(data.name);
	this.latitude = ko.observable(data.latitude);
	this.longitude = ko.observable(data.longitude);
};


/* ===== ViewModel ===== */

var ViewModel = function() {
	var self = this;

	/* == List of Places == */
	self.placeList = ko.observableArray([]);
	
	places.forEach(function(placeItem) {
		self.placeList.push(new Place(placeItem));
	});
	
	/* == Filter == */
	self.searchValue = ko.observable('');
	self.filteredList = ko.observableArray([]);
	self.markerList = ko.observableArray([]);
	
	self.filter = ko.computed(function() {
		// If nothing is searched for, populate the filteredList array with all items
		if (self.searchValue() == '') {
			self.filteredList(self.placeList());
		}
		// Clears the filteredlist array and populates it with names of matching search string
		else {
			self.filteredList([]);
			for (var i = 0; i < self.placeList().length; i++) {
				// Place name and search string converted to lower case for easier searching
				var name = self.placeList()[i].name().toLowerCase();
				if (name.includes(self.searchValue().toLowerCase())) {
					self.filteredList.push(self.placeList()[i]);
				}
			}
		}
		
		// Clears the markerList array to populate it with new search term
		for (var i = 0; i < self.markerList().length; i++) {
			self.markerList()[i].setMap(null);
		}
		self.markerList([]);
		
		// Pushes the markers matching the string to the markerList array
		for (var i = 0; i < self.filteredList().length; i++) {
			self.markerList().push(new google.maps.Marker({
				position: {lat: self.filteredList()[i].latitude(), lng: self.filteredList()[i].longitude()},
				animation: null
			}));
		}
		
		// Displays markers in the markerList array to the map
		// Adds an event listener to all markers in the markerList array
		for (var i = 0; i < self.markerList().length; i++) {
			self.markerList()[i].setMap(map);
			self.markerList()[i].addListener('click', (function(markerCopy) {
				return function() {
					self.toggleBounce(markerCopy);
				};
			})(i))
		}
	}, self);
	
	/* == Maps Bounds == */
	var bounds = new google.maps.LatLngBounds();
	self.latLngList = ko.observableArray([]);
	
	// Populates the latLntList array with the location of all markers
	for (var i = 0; i < self.placeList().length; i++) {
		self.latLngList.push(new google.maps.LatLng(self.placeList()[i].latitude(), self.placeList()[i].longitude()));
	}
	
	// Extends the bounds of the map to fit all markers
	for (var i = 0, latLngLen = self.latLngList().length; i < latLngLen; i++) {
		bounds.extend(self.latLngList()[i]);
	}
	
	// Displays the map with bounds
	map.fitBounds(bounds);
	
	/* == Bounce == */
	// Toggles the bounce animation if a marker is clicked or list item is clicked
	self.toggleBounce = function(index) {
		for (var i = 0; i < self.markerList().length; i++) {
			if (i !== index) {
				if (self.markerList()[i].getAnimation() !== null) {
					self.markerList()[i].setAnimation(null);
				}
			}
			else {
				if (self.markerList()[index].getAnimation() !== null) {
					self.markerList()[index].setAnimation(null);
				}
				else {
					self.markerList()[index].setAnimation(google.maps.Animation.BOUNCE);
				}
			}
		}
	};
};


ko.applyBindings(new ViewModel());