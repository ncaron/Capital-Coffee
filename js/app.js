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
    this.venueId = ko.observable(data.venue.id);
	this.latitude = ko.observable(data.venue.location.lat);
	this.longitude = ko.observable(data.venue.location.lng);
};

var ViewModel = function() {
    var self = this;

    self.placeList = ko.observableArray([]);
    self.coffeeShopList = ko.observableArray([]);
    self.markerList = ko.observableArray([]);
    self.latLngList = ko.observableArray([]);
    self.idList = ko.observableArray([]);

    // Needed for Foursquare API
    var clientId = '5PLNSFDCFOXXWLZOHDRG33R3PLP5OULVV0NQDPLZMOCON3OL';
    var clientSecret = 'DFRQK4JG21B1ECQ104LLNMH1O5TUQ4OZC2C24AAKZCTEPJAG';
    var version = '20151221';


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
        // This will make it easier to search for venue ids later
        self.idList(self.filteredList());
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
    	// This prevents from making a new request with coffee shop as the address
    	if (self.coffeeShopList().length == 0) {
    		var cityAddress = self.filteredList()[index].name();

	    	// Foursquare API URL
	    	var foursquareUrl = 'https://api.foursquare.com/v2/venues/explore?near=' + cityAddress + '&section=coffee&limit=25&client_id='
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
        // Resets to default map position when no coffee shops are present
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
        var venueId = self.idList()[index].venueId();

        // URL to get complete venue details
        var getVenue = '/venues/' + venueId;
        var getHours = '/venues/' + venueId + '/hours';
        var venueIdUrl = 'https://api.foursquare.com/v2/multi?requests=' + getVenue + ',' + getHours +
                         '&client_id=' + clientId + '&client_secret=' + clientSecret + '&v=' + version;

        // Get data from the Foursquare API
        $.ajax({
            url: venueIdUrl,
            dataType: 'json',
            success: function(data) {
                console.log(data);
                
                // Complete venue details
                var venue = data.response.responses[0].response.venue;
                var name = venue.name;
                var rating = venue.rating;
                var bestPhoto;
                var venueHours = data.response.responses[1].response.hours;

                // Displays venue name
                $('#iw-title').append(name);

                // Displays venue rating
                if (rating != undefined) {
                    $('#iw-rating').append(rating + '/10');
                }
                else {
                    $('#iw-rating').append('No rating to show.');
                }

                // Displays venue best photo
                if (venue.hasOwnProperty('bestPhoto')) {
                    bestPhoto = venue.bestPhoto.prefix + 'original' + venue.bestPhoto.suffix;
                }

                if (bestPhoto != undefined) {
                    $('#iw-photo').append('<img src="' + bestPhoto + '"style="width:100%; height: auto, display: block">');
                }
                else {
                    // Removes the div if there is no photo
                    $('#iw-photo').remove();
                    // Changes the class for hours if to center the content
                    $('#hasPhoto').toggleClass('col-md-5 col-md-12');
                }

                // Displays isOpen and status if available. Removes the div otherwise
                if (venue.hasOwnProperty('hours')) {
                    if (venue.hours.isOpen == true) {
                        $('#iw-isOpen').prepend('<p>Open Now</p>').css({'color': 'green'});
                    }
                    else {
                        $('#iw-isOpen').prepend('<p>Closed Now</p>').css({'color': 'red'});
                    }

                    if (venue.hours.hasOwnProperty('status')) {
                        $('#iw-status').append('<p>' + venue.hours.status + '</p>');
                    }
                    else {
                        $('#iw-status').remove();
                    }
                }
                else {
                    $('#iw-isOpen').remove();
                }

                // Displays venue hours
                if (venueHours.hasOwnProperty('timeframes')) {
                    var timeframes = venueHours.timeframes;

                    for (var i = 0; i < timeframes.length; i++) {
                        var days = timeframes[i].days;
                        var open = timeframes[i].open[0];

                        for (var j = 0; j < days.length; j++) {
                            var day = self.getDay(days[j]);
                            var startTime = self.getTime(open.start);
                            var endTime = self.getTime(open.end);

                            self.appendHours(day, startTime, endTime);
                        }
                    }
                }
                else {
                    // Removes the list and informs that there's no information
                    $('#iw-hours ul').remove();
                    $('#iw-hours').append('<p>No information available</p>');
                }
            }                             
        });

        // Clicking outside the map closes the info window and stops marker animation
        // Sets the bounds again
        map.addListener('click', function() {
            self.infowindow.close();
            self.markerList()[index].setAnimation(null);
            self.setBounds();
        });

    	self.markerAnimation = self.markerList()[index].getAnimation();

    	// If a info window is opened when another wants to open, close it
    	if (self.infowindow != null) {
    		self.infowindow.close();
    	}


    	self.infowindow = new google.maps.InfoWindow({
            content: '<div class="container iw-container">' +
                         '<div class="row">' +
                             '<div class="col-md-12" id="iw-title"></div>' +
                         '</div>' +
                         '<div class="row">' +
                                 '<div class="col-md-2" id="iw-rating"></div>' +
                         '</div>' +
                         '<div class="row">' +
                             '<div class="col-md-7" id="iw-photo"></div>' +
                             '<div class="col-md-5" id="hasPhoto">' +
                                 '<div class="row">' +
                                     '<div class="col-md-12" id="iw-isOpen"></div>' +
                                 '</div>' +
                                 '<div class="row">' +
                                     '<div class="col-md-12" id="iw-status"></div>' +
                                 '</div>' +
                                 '<div class="row">' +
                                     '<div class="col-md-12" id="iw-hoursOO">' +
                                         '<p>Hours of Operation</p>' +
                                     '</div>' +
                                 '</div>' +
                                 '<div class="row">' +
                                     '<div class="col-md-12" id="iw-hours">' +
                                         '<ul>' +
                                             '<li id="mon"><span>Monday</span><div>CLOSED</div></li>' +
                                             '<li id="tue"><span>Tuesday</span><div>CLOSED</div></li>' +
                                             '<li id="wed"><span>Wednesday</span><div>CLOSED</div></li>' +
                                             '<li id="thu"><span>Thursday</span><div>CLOSED</div></li>' +
                                             '<li id="fri"><span>Friday</span><div>CLOSED</div></li>' +
                                             '<li id="sat"><span>Saturday</span><div>CLOSED</div></li>' +
                                             '<li id="sun"><span>Sunday</span><div>CLOSED</div></li>' +
                                         '</ul>' +
                                     '</div>' +
                                 '</div>' +
                             '</div>' +
                         '</div>' +
                      '</div>'
    	});

        self.infowindow.addListener('domready', function() {
            $('.gm-style-iw').next('div').hide();

            // The next 5 lines of code are taken from a tutorial website, modified to my style
            // http://en.marnoto.com/2014/09/5-formas-de-personalizar-infowindow.html
            var iwOuter = $('.gm-style-iw');
            var iwBackground = iwOuter.prev();
            // Removes info window background shadow
            iwBackground.children(':nth-child(2)').css({'display' : 'none'});
            // Remove infow window white background
            iwBackground.children(':nth-child(4)').css({'display' : 'none'});
            // Put a border around the arrow to match the info window style
			iwBackground.children(':nth-child(3)').find('div').children().css({'border': '2px solid orange'});
        });

        
    	// Opens info window on top of corresponding marker
    	self.infowindow.open(map, self.markerList()[index]);

    	// If marker animation stops (clicks on marker or list), close info window
    	if (self.markerAnimation == null) {
    		self.infowindow.close();
    	}

        // Turns machine readable day to human readable day
        self.getDay = function(dayNumber) {
            if (dayNumber == 1) {
                return 'Monday';
            }
            else if (dayNumber == 2) {
                return 'Tuesday';
            }
            else if (dayNumber == 3) {
                return 'Wednesday';
            }
            else if (dayNumber == 4) {
                return 'Thursday';
            }
            else if (dayNumber == 5) {
                return 'Friday';
            }
            else if (dayNumber == 6) {
                return 'Saturday';
            }
            else if (dayNumber == 7) {
                return 'Sunday';
            }
        };

        // Turns machine readable time to human readable time
        self.getTime = function(time) {
            var firstChar = time.slice(0,1);

            // Some firstChar is +, this eliminates problems with that
            if (firstChar == '+') {
                time = time.slice(1);
            }

            if (time == 1200) {
                return 'Noon';
            }
            else if (time == 0000) {
                return 'Midnight';
            }
            else if (time >= 1300) {
                var hours = time.slice(0,2) - 12;
                var minutes = time.slice(2);
                var formattedTime = hours + ':' + minutes + ' PM';
                return formattedTime;
            }
            else if (time < 1000) {
                var hours = time.slice(1,2);
                var minutes = time.slice(2);
                var formattedTime = hours + ':' + minutes + ' AM';
                return formattedTime;
            }
            else {
                var hours = time.slice(0,2);
                var minutes = time.slice(2);
                var formattedTime = hours + ':' + minutes + ' AM';
                return formattedTime;
            }
        };

        // Replaces hardcoded data with fetched data
        self.appendHours = function(day, startTime, endTime) {
            if (day == 'Monday') {
                $('#mon').replaceWith('<li><span>' + day + '</span><div>' + startTime + ' - ' + endTime + '</div></li>');
            }
            else if (day == 'Tuesday') {
                $('#tue').replaceWith('<li><span>' + day + '</span><div>' + startTime + ' - ' + endTime + '</div></li>');
            }
            else if (day == 'Wednesday') {
                $('#wed').replaceWith('<li><span>' + day + '</span><div>' + startTime + ' - ' + endTime + '</div></li>');
            }
            else if (day == 'Thursday') {
                $('#thu').replaceWith('<li><span>' + day + '</span><div>' + startTime + ' - ' + endTime + '</div></li>');
            }
            else if (day == 'Friday') {
                $('#fri').replaceWith('<li><span>' + day + '</span><div>' + startTime + ' - ' + endTime + '</div></li>');
            }
            else if (day == 'Saturday') {
                $('#sat').replaceWith('<li><span>' + day + '</span><div>' + startTime + ' - ' + endTime + '</div></li>');
            }
            else if (day == 'Sunday') {
                $('#sun').replaceWith('<li><span>' + day + '</span><div>' + startTime + ' - ' + endTime + '</div></li>');
            }
        };
    };

    // When a list item is clicked, getCoffee. toggleBounce otherwise
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