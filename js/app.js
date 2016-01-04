/* ===== Map ===== */
var google;
var map;
var DEFAULT_CENTER = {lat: 47, lng: 23};
var DEFAULT_ZOOM = 5;

// Handle error if map cannot be loaded
if (google == undefined) {
    $('.mapError').html('<p>Google Maps API cannot be reached. Please try again later.</p>');
}
else {
    $('.mapError').remove();

    var mapOptions = {
        zoom: DEFAULT_ZOOM,
        center: DEFAULT_CENTER,
        mapTypeControlOptions: {position: google.maps.ControlPosition.TOP_RIGHT}
    };

    map = new google.maps.Map(document.getElementById('map'), mapOptions);
}



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
    self.foursquareError = ko.observable();

    // Needed for Foursquare API
    var clientId = '5PLNSFDCFOXXWLZOHDRG33R3PLP5OULVV0NQDPLZMOCON3OL';
    var clientSecret = 'DFRQK4JG21B1ECQ104LLNMH1O5TUQ4OZC2C24AAKZCTEPJAG';
    var version = '20151221';


    /* == Filter == */
    self.searchValue = ko.observable();
    self.filteredList = ko.observableArray([]);

    self.filter = ko.computed(function() {
        if (self.foursquareError() == true) {
            self.filteredList([]);
            self.foursquareError(false);
        }
    	// If a city has been clicked and nothing was searched for, populate the list with all coffee shops from this capital
    	else if (self.coffeeShopList().length != 0 && (self.searchValue() == '' || self.searchValue() == undefined)) {
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

        // Removes error message
        $('.apiError').html('');
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
	    	})
            .fail(function() {
                self.foursquareError(true);
                var foursquareErrorMsg = 'Foursquare API cannot be reached. Please try again later.';

                $('.apiError').append(foursquareErrorMsg);
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
        var venueError;

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
                venueError = false;
                self.getIwContent(venueError);

                // Complete venue details
                var venue = data.response.responses[0].response.venue;
                var name = venue.name;
                var rating = venue.rating;
                var bestPhoto;
                var venueHours = data.response.responses[1].response.hours;
                var venueDescription;
                var tipCount = venue.tips.groups[0].count;
                var tips;
                var canonicalUrl = venue.canonicalUrl;
                var phone;
                var formattedAddress;

                // Displays venue name
                // Adds link if venue has URL
                if (venue.hasOwnProperty('url')) {
                    var venueUrl = venue.url;
                    $('#iw-title').append('<a href="' + venueUrl + '" target="_blank">' + name + '</a>');
                }
                else {
                    $('#iw-title').append(name);
                }

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

                // Displays description
                // Removes the div in none is available
                if (venue.hasOwnProperty('description')) {
                    venueDescription = venue.description;
                    $('#iw-description').append('<p>About</p>');
                    $('#iw-description').append('<p>' + venueDescription + '</p>');
                }
                else {
                    $('#iw-description').remove();
                }

                // Displays tips
                // Remove the div if none is available
                if (tipCount == 0) {
                    $('#iw-tips').remove();
                }
                else {
                    tips = venue.tips.groups[0].items;
                    self.getTips(tips);
                    $('#iw-tips').prepend('<p class="hasTips">What others have to say</p>');
                }

                // Displays phone number
                // Remove the divs otherwise
                if (venue.contact.hasOwnProperty('formattedPhone')) {
                    phone = venue.contact.formattedPhone;
                    $('#iw-phoneIcon').append('<i class="fa fa-phone-square"></i>');
                    $('#iw-phoneNum').append('<p>' + phone + '</p>');
                }
                else {
                    $('#iw-phoneIcon').remove();
                    $('#iw-phoneNum').remove();
                }

                // Displays Foursquare icon
                $('#iw-social').append('<a href="' + canonicalUrl + '" target="_blank"><i class="fa fa-foursquare"></i></a>');

                // Displays Facebook icon
                if (venue.contact.hasOwnProperty('facebook')) {
                    var facebookId = venue.contact.facebook;
                    $('#iw-social').append('<a href="https://www.facebook.com/' + facebookId + '" target="_blank"><i class="fa fa-facebook-official"></i></a>');
                }

                // Displays Twitter icon
                if (venue.contact.hasOwnProperty('twitter')) {
                    var twitterId = venue.contact.twitter;
                    $('#iw-social').append('<a href="https://www.twitter.com/' + twitterId + '" target="_blank"><i class="fa fa-twitter"></i></a>');
                }

                if (venue.location.hasOwnProperty('formattedAddress')) {
                    for (var i = 0; i < venue.location.formattedAddress.length; i++) {
                        formattedAddress = venue.location.formattedAddress[i];
                        $('#iw-formattedAddress').append('<p>' + formattedAddress + '</p>');
                    }
                }
            }
        })
        .fail(function() {
            venueError = true;
            self.getIwContent(venueError, index);
        });

        // Clicking outside the map closes the info window and stops marker animation
        map.addListener('click', function() {
            self.infowindow.close();
            self.markerList()[index].setAnimation(null);
        });

    	self.markerAnimation = self.markerList()[index].getAnimation();

    	// If a info window is opened when another wants to open, close it
    	if (self.infowindow != null) {
    		self.infowindow.close();
    	}

        // These comments will make it easier to idenfity and change content
    	self.infowindow = new google.maps.InfoWindow({
            content: '<div class="container iw-container">' + // .container .iw-container
                         '<div class="row">' +
                             '<div class="col-md-12 loading">'+
                                 '<i class="fa fa-spinner fa-spin"></i>' +
                             '</div>' +
                         '</div>' +
                      '</div>' // End .container .iw-container
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

        // Sets content to display in info window
        self.getIwContent = function(venueError, index) {
            var contentString;

            if (venueError == false) {
                contentString = '<div class="container iw-container">' + // .container .iw-container
                                    '<div class="row">' +
                                        '<div class="col-md-12" id="iw-title"></div>' + // #iw-title
                                    '</div>' +
                                    '<div class="row">' +
                                        '<div class="col-md-2" id="iw-rating"></div>' + // #iw-rating
                                    '</div>' +
                                    '<div class="row">' +
                                        '<div class="col-md-7" id="iw-photo"></div>' + // #iw-photo
                                        '<div class="col-md-5" id="hasPhoto">' + // #iw-hasPhoto
                                            '<div class="row">' +
                                                '<div class="col-md-12" id="iw-isOpen"></div>' + // #iw-isOpen
                                            '</div>' +
                                            '<div class="row">' +
                                                '<div class="col-md-12" id="iw-status"></div>' + // #iw-status
                                            '</div>' +
                                            '<div class="row">' +
                                                '<div class="col-md-12" id="iw-hoursOO">' + // #iw-hoursOO
                                                    '<p>Hours of Operation</p>' +
                                                '</div>' + // End #iw-hoursOO
                                            '</div>' +
                                            '<div class="row">' +
                                                '<div class="col-md-12" id="iw-hours">' + // #iw-hours
                                                    '<ul>' +
                                                        '<li id="mon"><span>Monday</span><div>CLOSED</div></li>' +
                                                        '<li id="tue"><span>Tuesday</span><div>CLOSED</div></li>' +
                                                        '<li id="wed"><span>Wednesday</span><div>CLOSED</div></li>' +
                                                        '<li id="thu"><span>Thursday</span><div>CLOSED</div></li>' +
                                                        '<li id="fri"><span>Friday</span><div>CLOSED</div></li>' +
                                                        '<li id="sat"><span>Saturday</span><div>CLOSED</div></li>' +
                                                        '<li id="sun"><span>Sunday</span><div>CLOSED</div></li>' +
                                                    '</ul>' +
                                                '</div>' + // End #iw-hours
                                            '</div>' +
                                        '</div>' + // End #iw-hasPhoto
                                    '</div>' +
                                    '<div class="row">' +
                                        '<div class="col-md-12" id="iw-description"></div>' + // #iw-description
                                    '</div>' +
                                    '<div class="row">' +
                                        '<div class="col-md-12" id="iw-tips"></div>' + // #iw-tips
                                    '</div>' +
                                    '<div class="row">' +
                                        '<div class="col-md-12">'+
                                            '<div class="row">' +
                                                '<div class="col-md-6" id="iw-contact">' + // #iw-contact
                                                    '<p>Contact</p>' +
                                                    '<div class="row">' +
                                                        '<div class="col-md-4" id="iw-phoneIcon"></div>' + // #iw-phoneIcon
                                                        '<div class="col-md-8" id="iw-phoneNum"></div>' + // #iw-phoneNum
                                                    '</div>' +
                                                    '<div class="row">' +
                                                        '<div class="col-md-12" id="iw-social"></div>' + // #iw-social
                                                    '</div>' +
                                                '</div>' + //End #iw-contact
                                                '<div class="col-md-6" id="iw-location">' + // #iw-location
                                                    '<p>Location</p>' +
                                                    '<div class="row">' +
                                                        '<div class="col-md-12" id="iw-formattedAddress"></div>' + // #iw-formattedAddress
                                                    '</div>' +
                                                '</div>' + // End #iw-location
                                            '</div>' +
                                        '</div>' +
                                    '</div>' +
                                '</div>'; // End .container .iw-container
            }
            else {
                var name = self.filteredList()[index].name();
                contentString = '<div class="container iw-container">' + // .container .iw-container
                                    '<div class="row">' +
                                        '<div class="col-md-12" id="iw-title"><p>' + name + '</p></div>' + // #iw-title
                                    '</div>' +
                                    '<div class="row">' +
                                        '<div class="col-md-12">' +
                                            '<p class="apiError">Foursquare API cannot be reached. Please try again later.</p>' +
                                        '</div>' +
                                    '</div>' +
                                '</div>'; // End .container .iw-container
            }

            self.infowindow.setContent(contentString);
        };

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

        // Fetches tip text and user
        self.getTips = function(tips) {
            var text;
            var firstName;
            var lastName;
            var formattedName;
            var length;

            // Max number of tips to display = 5
            if (tips.length > 5) {
                length = 5;
            }
            else {
                length = tips.length;
            }

            for (var i = 0; i < length; i++) {
                text = tips[i].text;

                // Determines if the tipper has first and last name 
                if (tips[i].hasOwnProperty('user')) {
                    if (tips[i].user.hasOwnProperty('firstName')) {
                        firstName = tips[i].user.firstName;
                    }
                    else {
                        firstName = '';
                    }

                    if (tips[i].user.hasOwnProperty('lastName')) {
                        lastName = tips[i].user.lastName;
                    }
                    else {
                        lastName = '';
                    }
                }
                else {
                    firstName = '';
                    lastName = '';
                }

                // Formats the name of the tipper
                if (firstName != '' && lastName != '') {
                    formattedName = firstName + ' ' + lastName;
                }
                else if (firstName != '' && lastName == '') {
                    formattedName = firstName;
                }
                else if (firstName == '' && lastName != '') {
                    formattedName = lastName;
                }
                else {
                    formattedName = 'Unknown';
                }

                self.appendTips(text, formattedName, length, i);
            }
        };

        // Appends tips to the screen
        self.appendTips = function(text, formattedName, length, index) {
            var formattedTip = '<blockquote>' +
                                   '<p>' + text + '</p>' +
                                   '<footer>' + formattedName + '</footer>' +
                               '</blockquote>'
    
            // Makes sure there's no horizontal rule below last entry                   
            if (length - 1 != index) {
                $('#iw-tips').append(formattedTip + '<hr>');
            }
            else {
                $('#iw-tips').append(formattedTip);
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
    })
    .fail(function() {
        var CountriesErrorMessage = 'REST Countries API cannot be reached. Please try again later.'
        $('.apiError').append(CountriesErrorMessage);
        console.log('test');
    });
}
 
ko.applyBindings(new ViewModel());