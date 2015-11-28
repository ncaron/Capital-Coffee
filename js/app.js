/* ===== Map ===== */

var map;

// TODO: Change coordinates
var mapOptions = {
	zoom: 15,
	center: {lat: 45.419228, lng: -75.6931989},
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
	this.marker = new google.maps.Marker({
		position: {lat: this.latitude(), lng: this.longitude()},
		map: map,
		animation: null
	});
};


/* ===== ViewModel ===== */

var ViewModel = function() {
	var self = this;
	
	this.placeList = ko.observableArray([]);
	
	places.forEach(function(placeItem) {
		self.placeList.push(new Place(placeItem));
	});
	
	// Adds an event listener to all markers to toggle bounce on click
	for (var i = 0; i < self.placeList().length; i++) {
		self.placeList()[i].marker.addListener('click', (function(markerCopy) {
			return function() {
				self.toggleBounce(markerCopy);
			};
		})(i))
	}
	
	// Toggles the bounce animation if a marker is clicked or list item is clicked
	self.toggleBounce = function(index) {
		for (var i = 0; i < self.placeList().length; i++) {
			if (i !== index) {
				if (self.placeList()[i].marker.getAnimation() !== null) {
					self.placeList()[i].marker.setAnimation(null);
				}
			}
			else {
				if (self.placeList()[index].marker.getAnimation() !== null) {
					self.placeList()[index].marker.setAnimation(null);
				}
				else {
					self.placeList()[index].marker.setAnimation(google.maps.Animation.BOUNCE);
				}
			}
		}
	};
};


ko.applyBindings(new ViewModel());