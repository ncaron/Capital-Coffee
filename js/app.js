/* ===== Map ===== */

var map;
var DEFAULT_CENTER = {lat: 47, lng: 23};
var DEFAULT_ZOOM = 5;

// TODO: Change coordinates
var mapOptions = {
	zoom: DEFAULT_ZOOM,
	center: DEFAULT_CENTER,
	mapTypeControlOptions: {position: google.maps.ControlPosition.TOP_RIGHT}
};

map = new google.maps.Map(document.getElementById('map'), mapOptions);

// The capital city
var Place = function(data) {
	this.name = ko.observable(data.capital + ', ' + data.name);
};

// The coffee shops
var CoffeeShops = function(data) {
	this.name = ko.observable(data.venue.name);
	this.latitude = ko.observable(data.venue.location.lat);
	this.longitude = ko.observable(data.venue.location.lng);
};

var ViewModel = function() {
    var self = this;
    // Array of capital cities
    self.placeList = ko.observableArray([]);
    self.coffeeShopList = ko.observableArray([]);
    self.markerList = ko.observableArray([]);
    self.latLngList = ko.observableArray([]);


    /* == Filter == */
    self.searchValue = ko.observable();
    self.filteredList = ko.observableArray([]);

    self.filter = ko.computed(function() {
    	// If a city has been clicked and nothing was searched for, populate the list with all coffee shops from this capital
    	if (self.coffeeShopList().length != 0 && (self.searchValue() == '' || self.searchValue() == undefined)) {
    		self.filteredList(self.coffeeShopList());
            self.getMarkers();
    	}
    	// If a city has not been clicked and nothing is searched for, populate the list with cities
    	else if (self.coffeeShopList().length == 0 && (self.searchValue() == '' || self.searchValue() == undefined)) {
    		self.filteredList(self.placeList());
    	}
    	// Clears the filteredList array and populates it with the names matching the search string
    	// Will filter cities or coffee shops depending on previous condition
    	else {
    		self.filteredList([]);

    		// If coffeeShopList is bigger than 0, filter coffeeShopList
    		// Filter placeList otherwise
    		if (self.coffeeShopList().length != 0) {
    			self.filterCurrentList(self.coffeeShopList());
                self.getMarkers();
    		}
    		else {
    			self.filterCurrentList(self.placeList());
    		}
    	}
    }, self);

	// Function to filter the current list
	// Avoids repetition in self.filter
	self.filterCurrentList = function(currentList) {
		for (var i = 0; i < currentList.length; i++) {
			// Place name and search string converted to lowercase for easier searching
			var name = currentList[i].name().toLowerCase();

			// Populates the filteredList array with place names matching search term
			if (name.includes(self.searchValue().toLowerCase())) {
				self.filteredList.push(currentList[i]);
			}
		}
	};

    /* == Back == */
    self.back = function() {
    	// Resets search value
    	self.searchValue('');

    	self.filteredList(self.placeList());
    	self.coffeeShopList([]);
    	self.getMarkers();
    };

    /* == Get Coffee == */
    self.getCoffee = function(index) {
    	// Only executes if the coffeeShopList is empty
    	// This prevents from making a new request with coffee shop is the address
    	if (self.coffeeShopList().length == 0) {
    		var cityAddress = self.filteredList()[index].name();

	    	// Essential for Foursquare API
	    	var clientId = '5PLNSFDCFOXXWLZOHDRG33R3PLP5OULVV0NQDPLZMOCON3OL';
	    	var clientSecret = 'DFRQK4JG21B1ECQ104LLNMH1O5TUQ4OZC2C24AAKZCTEPJAG';
	    	var version = '20151221';

	    	// Foursquare API URL
	    	var foursquareUrl = 'https://api.foursquare.com/v2/venues/explore?near=' + cityAddress + '&section=coffee&limit=10&client_id='
	    						+ clientId + '&client_secret=' + clientSecret + '&v=' + version;


	    	// Gets data from the Foursquare API
	    	$.getJSON(foursquareUrl, function(data) {
	    		// Adds all coffee shops to an array
	    		var mappedCoffeeShopList = $.map(data.response.groups[0].items, function(coffee) {
	    			return new CoffeeShops(coffee);
	    		});
	    		self.coffeeShopList(mappedCoffeeShopList);
	    		self.filteredList(self.coffeeShopList());
	    		self.searchValue('');
	    	});
	    }
    };
     
    /* == Get Markers == */
    self.getMarkers = function() {
        // Clears the marketList array to populate it with new markers
        for (var i = 0; i < self.markerList().length; i++) {
            self.markerList()[i].setMap(null);
        }
        self.markerList([]);


        if (self.coffeeShopList().length != 0) {
            // Populates the marker list with corresponding city/filter
            for (var i = 0; i < self.filteredList().length; i++) {
                var coffeeShopName = self.filteredList()[i].name();
                var coffeeShopPosition = {lat: self.filteredList()[i].latitude(), lng: self.filteredList()[i].longitude()};

                self.markerList().push(new google.maps.Marker({
                    title: coffeeShopName,
                    position: coffeeShopPosition,
                    animation: null
                }));
            }
        }

        self.placeMarkers();
    };

    /* == Place Markers == */
    self.placeMarkers = function() {
        if (self.coffeeShopList().length == 0) {
            map.setCenter(DEFAULT_CENTER);
            map.setZoom(DEFAULT_ZOOM);
        }
        else {
        // Places the markers on the map
        for (var i = 0; i < self.markerList().length; i++) {
            self.markerList()[i].setMap(map);

            self.markerList()[i].addListener('click', (function(markerCopy) {
                return function() {
                    self.toggleBounce(markerCopy);
                    self.toggleWindow(markerCopy);
                };
            })(i));
        }
        if (self.markerList().length != 0) {
            self.setBounds();
        }
    }
};

    self.setBounds = function() {
    	self.latLngList([]);
    	self.bounds = new google.maps.LatLngBounds();

    	// Puts the position of all markers into a latLngList array
    	for (var i = 0; i < self.markerList().length; i ++) {
    		var markerPosition = {lat: self.markerList()[i].position.lat(), lng: self.markerList()[i].position.lng()};
    		self.latLngList().push(new google.maps.LatLng(markerPosition));
    	}

    	// Uses the marker position in LatLngList to extend the bounds of the map
    	for (var i = 0; i < self.latLngList().length; i++) {
    		self.bounds.extend(self.latLngList()[i]);
    	}
    	map.fitBounds(self.bounds);
    };

    /* == Bounce == */
    self.toggleBounce = function(index) {
    	// Iterates through all markers on the map
    	for (var i = 0; i < self.markerList().length; i++) {
    		var currentMarker = self.markerList()[i];

    		// Sets animation of clicked marker to bounce
    		// Else sets the marker animation to null (also does this if clicked marker is already bouncing)
    		if (i == index && currentMarker.getAnimation() == null) {
    			currentMarker.setAnimation(google.maps.Animation.BOUNCE);
    		}
    		else {
    			currentMarker.setAnimation(null);
    		}
    	}
    };

    /* == Info Window == */
    self.toggleWindow = function(index) {
    	self.markerAnimation = self.markerList()[index].getAnimation();

    	// If a info window is opened when another wants to open, close it
    	if (self.infowindow != null) {
    		self.infowindow.close()
    	}

    	// Sets content of info window 
    	self.infowindow = new google.maps.InfoWindow({
    		content: self.filteredList()[index].name()
    	});

    	// Opens info window on top of corresponding marker
    	self.infowindow.open(map, self.markerList()[index]);

    	// If the X button on the info window is clicked, stop animaton for corresponding marker
    	self.infowindow.addListener('closeclick', function() {
    		self.markerList()[index].setAnimation(null);
    	});

    	// If marker animation stops (clicks on marker or list), close info window
    	if (self.markerAnimation == null) {
    		self.infowindow.close();
    	}
    };

    // When a list item is clicked, getCoffee, toggleBounce otherwise
    self.onListClick = function(index) {
    	if (self.markerList() == 0) {
    		self.getCoffee(index);
    	}
    	else {
    		self.toggleBounce(index);
    		self.toggleWindow(index);
    	}
    };

    // REST Countries API URL
    var countryInfoUrl = 'https://restcountries.eu/rest/v1/all';

    // Gets data from the REST Countries API
    $.getJSON(countryInfoUrl, function(data) {
    	// Adds all countries to a list of places
    	var mappedPlaceList = $.map(data, function(place) {
    		// Makes sure only countries of Europe gets added
    		if (place.region == 'Europe') {
    			return new Place(place);
    		}
    	});
    	self.placeList(mappedPlaceList);
    });
}
 
ko.applyBindings(new ViewModel());