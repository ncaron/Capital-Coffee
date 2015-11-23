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
		longitude: 45.427655,
		latitude: -75.692391
	},
	{
		name: 'Parliament of Canada',
		longitude: 45.425118,
		latitude: -75.699917
	},
	{
		name: 'University of Ottawa',
		longitude: 45.423126,
		latitude: -75.683108
	},
	{
		name: 'Canadian War Museum',
		longitude: 45.417107,
		latitude: -75.716942
	},
	{
		name: 'National Gallery of Canada',
		longitude: 45.429537,
		latitude: -75.698903
	}
];

var Place = function(data) {
	this.name = ko.observable(data.name);
	this.longitude = ko.observable(data.longitude);
	this.latitude = ko.observable(data.latitude);
};


/* ===== ViewModel ===== */

var ViewModel = function() {
	var self = this;
	
	this.placeList = ko.observableArray([]);
	
	places.forEach(function(placeItem) {
		self.placeList.push(new Place(placeItem));
	});

};


ko.applyBindings(new ViewModel());