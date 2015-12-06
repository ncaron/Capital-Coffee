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
	self.latLngList = ko.observableArray([]);
	
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
		
		// If search returns no results(length of filteredList = 0), does not change center and zoom level of the map
		if (self.filteredList().length != 0) {
			// Resets the latLngList array and bounds for the new search term
			self.latLngList([]);
			self.bounds = new google.maps.LatLngBounds();
			
			// Pushes the markers matching the string to the markerList array
			for (var i = 0; i < self.filteredList().length; i++) {
				self.markerList().push(new google.maps.Marker({
					position: {lat: self.filteredList()[i].latitude(), lng: self.filteredList()[i].longitude()},
					title: self.filteredList()[i].name(),
					animation: null
				}));
				// Pushes the bounds of the current markers to the latLntList array
				self.latLngList.push(new google.maps.LatLng(self.filteredList()[i].latitude(), self.filteredList()[i].longitude()));
			}
		}
		
		// Displays markers in the markerList array to the map
		// Adds an event listener to all markers in the markerList array
		for (var i = 0; i < self.markerList().length; i++) {
			self.markerList()[i].setMap(map);
			self.markerList()[i].addListener('click', (function(markerCopy) {
				return function() {
					self.toggleBounce(markerCopy);
					self.toggleWindow(markerCopy);
				};
			})(i))
		}
		
		// Changes the bounds for every marker added/removed from the map
		for (var i = 0, latLngLen = self.latLngList().length; i < latLngLen; i++) {
			self.bounds.extend(self.latLngList()[i]);
		}
		
		// Prevents map from zooming too far if only 1 marker is on the map
		// Help from: http://stackoverflow.com/questions/3334729
		if (self.bounds.getNorthEast().equals(self.bounds.getSouthWest())) {
			self.point1 = new google.maps.LatLng(self.bounds.getNorthEast().lat() + 0.01, self.bounds.getNorthEast().lng() + 0.01);
			self.point2 = new google.maps.LatLng(self.bounds.getNorthEast().lat() - 0.01, self.bounds.getNorthEast().lng() - 0.01);
			self.bounds.extend(self.point1);
			self.bounds.extend(self.point2);
		}
		
		// Sets the center and zoom level of the map according to the bounds
		map.fitBounds(self.bounds);
	}, self);
		
	// Triggers toggleBounce and toggleWindow when the button is clicked on in the list view
	self.toggle = function(index) {
		self.toggleBounce(index);
		self.toggleWindow(index);
	};
	
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
	
	/* == Info Window == */
	// Toggles the info window
	self.toggleWindow = function(index) {
		self.markerAnimation = self.markerList()[index].getAnimation();
		
		// If info window is opened when another wants to open, close it
		if (self.infowindow != null) {
			self.infowindow.close();
		}
		
		// Sets the new info window with the name of the place.
		// Temporary. Replace with AJAX?
		self.infowindow = new google.maps.InfoWindow({
			content: self.filteredList()[index].name()
		});
		
		// Opens the info window
		self.infowindow.open(map, self.markerList()[index]);
		
		// If the x button on the info window is clicked, stop the bounce animation for corresponsind marker
		self.infowindow.addListener('closeclick', function() {
			self.markerList()[index].setAnimation(null);
		});
		
		// If bounce animation stops, close the infow window
		if (self.markerAnimation == null) {
			self.infowindow.close();
		}
	};
};


ko.applyBindings(new ViewModel());