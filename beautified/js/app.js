/**
  * Niko Caron
  * Project 5-a for Udacity's front end web developer nanodegree.
  * Search for coffee shops in world's capitals.
*/

'use strict';

/* ===== Map ===== */
var map;
var DEFAULT_CENTER = {
    lat: 47,
    lng: 23
};
var DEFAULT_ZOOM = 5;

/**
  * Displays the map.
*/
window.initMap = function() {
    var mapOptions = {
        zoom: DEFAULT_ZOOM,
        center: DEFAULT_CENTER,
        mapTypeControlOptions: {
            position: google.maps.ControlPosition.TOP_RIGHT
        }
    };

    map = new google.maps.Map(document.getElementById('map'), mapOptions);
    map.controls[google.maps.ControlPosition.RIGHT_TOP].push(legend);

    initialize();
};


/**
  * Sets isMapError to true.
  * This will ensure the user has an error message(Google) when other parts of the app loads.
*/
window.mapError = function() {
    var isMapError = true;

    initialize(isMapError);
};

/**
  * The capital city model.
  * @param data - Data received from the REST Countries API.
*/
var Place = function(data) {
    this.name = ko.observable(data.capital + ', ' + data.name);
    this.region = ko.observable(data.region);
};

/**
  * The coffee shop model.
  * if - List of coffee shops
  * else - List of favorite coffee shops
  * @param data - Data received from the Foursquare API.
*/
var CoffeeShops = function(data) {
    if (data.hasOwnProperty('venue')) {
        this.name = ko.observable(data.venue.name);
        this.venueId = ko.observable(data.venue.id);
        this.latitude = ko.observable(data.venue.location.lat);
        this.longitude = ko.observable(data.venue.location.lng);
    }
    else {
        this.name = ko.observable(data.name);
        this.venueId = ko.observable(data.id);
        this.latitude = ko.observable(data.location.lat);
        this.longitude = ko.observable(data.location.lng);
    }
};

/**
  * The view model.
  * @param isMapError - Detects if the map has loaded properly.
*/
var ViewModel = function(isMapError) {
    var self = this;

    // Error messages
    var mapErrorText = 'Google Maps API cannot be reached. Please try again later.';
    var faveMsg = 'To add favorites, click on coffee shop name in the list or marker then click on the star next to the coffee shop name. Please click on the above back button to return to the capitals list.';
    var foursquareErrorMsg = 'Foursquare API cannot be reached. Please try again later.';
    var CountriesErrorMessage = 'REST Countries API cannot be reached. Please try again later.';
    var noCoffeeMsg = 'No coffee shops found in this capital, please click the back button and choose a different location.';

    self.mapErrorTextUpdate = ko.observable();
    self.errorMsg = ko.observable('');

    // Regions
    self.allPlaceList = ko.observableArray([]);
    self.currentRegionList = ko.observable([]);
    self.africa = ko.observableArray([]);
    self.americas = ko.observableArray([]);
    self.asia = ko.observableArray([]);
    self.europe = ko.observableArray([]);
    self.oceania = ko.observableArray([]);

    self.filteredList = ko.observableArray([]);
    self.searchValue = ko.observable('');

    self.coffeeShopList = ko.observableArray([]);
    self.markerList = ko.observableArray([]);
    self.latLngList = ko.observableArray([]);
    self.idList = ko.observableArray([]);
    self.foursquareError = ko.observable();
    self.hasCoffee = ko.observable(false);
    self.currentVenue = ko.observable();
    self.starClick = ko.observable(false);
    self.favoritesList = ko.observableArray([]);
    self.faveBtnClick = ko.observable(false);
    self.noFavorites = ko.observable(false);
    self.favoritesLength = ko.observable();
    self.faveBtnText = ko.observable();

    // Required for Foursquare API.
    var clientId = '5PLNSFDCFOXXWLZOHDRG33R3PLP5OULVV0NQDPLZMOCON3OL';
    var clientSecret = 'DFRQK4JG21B1ECQ104LLNMH1O5TUQ4OZC2C24AAKZCTEPJAG';
    var version = '20151221';

    // If map can't be loaded, display an error message on the screen.
    if (isMapError) {
        self.mapErrorTextUpdate(mapErrorText);
    }
    else {
        self.mapErrorTextUpdate('');
    }

    // Populates favoritesList array with favorites, if any is available.
    if (localStorage.getItem('favoriteKey') !== null) {
        self.favoritesList(JSON.parse(localStorage.getItem('favoriteKey')));
    }

    /**
      * Detects if the star icon has been clicked.
      * Sets the text of the favorite button.
    */
    self.favorites = ko.computed(function() {
        if (self.starClick()) {
            $('#favorite').toggleClass('starred');
            self.updateFavorites();
            self.starClick(false);
        }

        self.favoritesLength(self.favoritesList().length);
        self.faveBtnText('My Favorites' + ' (' + self.favoritesLength() + ')');
    }, self);

    /**
      * Checks the list of favorites to apply appropriate CSS.
    */
    self.checkFavorites = function() {
        var currentVenueId = self.currentVenue().id;
        var isFavorite = false;
        var favoritesListLength = self.favoritesList().length;
        var i;

        // Checks the ID of the clicked venue VS IDs of favorite venues
        for (i = 0; i < favoritesListLength; i++) {
            var favoriteVenueId = self.favoritesList()[i].id;

            if (currentVenueId === favoriteVenueId) {
                isFavorite = true;
                break;
            }
        }

        if (isFavorite) {
            $('#favorite').toggleClass('starred');
        }
    };

    /**
      * Updates favorites list when a star is clicked.
    */
    self.updateFavorites = function() {
        var isStarred = $('#favorite').hasClass('starred');

        // If isStarred is true(was previously not in list of favorites), add it to the list.
        // Else remove it from favorites.
        if (isStarred) {
            self.favoritesList().push(self.currentVenue());
            localStorage.setItem('favoriteKey', JSON.stringify(self.favoritesList()));
            self.markerIcon();
        }
        else {
            var favoritesListLength = self.favoritesList().length;
            var currentVenueId = self.currentVenue().id;
            var i;

            for (i = 0; i < favoritesListLength; i++) {
                var favoriteVenueId = self.favoritesList()[i].id;

                if (currentVenueId === favoriteVenueId) {
                    break;
                }
            }

            self.favoritesList().splice(i, 1);
            localStorage.setItem('favoriteKey', JSON.stringify(self.favoritesList()));
            self.markerIcon();
        }
    };

    /**
      * Applies proper marker icon for favorites.
      * if (1) - Only triggers if favorites exists.
    */
    self.markerIcon = function() {
        var markerListLength = self.markerList().length;
        var i;

        if (self.favoritesList().length != 0) {
            var favoritesListLength = self.favoritesList().length;
            var j;

            // Iterates through all markers in the list.
            for (i = 0; i < markerListLength; i++) {
                var markerId = self.markerList()[i].markerId;

                // Iterates through the favorite list and compare current marker with each.
                for (j = 0; j < favoritesListLength; j++) {
                    var venueNameId = self.favoritesList()[j].name + ', ' + self.favoritesList()[j].id;

                    // Sets the icon.
                    if (markerId === venueNameId) {
                        self.markerList()[i].setIcon('images/faveCoffee.png');
                        break;
                    }
                    else {
                        self.markerList()[i].setIcon('images/coffee.png');
                    }
                }
            }
        }
        else {
            for (i = 0; i < markerListLength; i++) {
                self.markerList()[i].setIcon('images/coffee.png');
            }
        }
    };

    /**
      * Detects if favorite button is clicked.
      * if - If favorites exists, getCoffee()
    */
    self.listFavorites = function() {
        if (self.favoritesList().length > 0) {
            self.faveBtnClick(true);
            self.getCoffee();
        }
        else {
            self.noFavorites(true);
        }
    };

    /**
      * Sets the region.
      * @param region - The selected region.
    */
    self.setRegion = function(region) {
        self.errorMsg('');
        self.searchValue('');
        self.coffeeShopList([]);
        self.getMarkers();
        self.hasCoffee(false);
        self.foursquareError(false);

        if (region == 'Africa') {
            self.currentRegionList(self.africa());
        }
        else if (region == 'Americas') {
            self.currentRegionList(self.americas());
        }
        else if (region == 'Asia') {
            self.currentRegionList(self.asia());
        }
        else if (region == 'Europe') {
            self.currentRegionList(self.europe());
        }
        else if (region == 'Oceania') {
            self.currentRegionList(self.oceania());
        }
    };

    /**
      * Detects error messages.
      * Sets which list to filter(capital or coffee).
    */
    self.filter = ko.computed(function() {

        // Displays a how to message to the user if no favorites are in the list.
        if (self.noFavorites()) {
            self.filteredList([]);
            self.coffeeShopList([]);
            self.searchValue('');
            self.getMarkers();
            self.errorMsg(faveMsg);
            self.noFavorites(false);
        }
        else if (self.foursquareError()) {
            self.filteredList([]);
        }
        else if (self.hasCoffee()) {
            self.filteredList([]);
            self.errorMsg(noCoffeeMsg);
        }
        // If a city has been clicked(or populated favorite list) and nothing was searched for, populate the list with all coffee shops from this capital.
        else if (self.coffeeShopList().length != 0 && self.noFavorites() == false && self.searchValue() == '') {
            self.filteredList(self.coffeeShopList());
            self.getMarkers();
        }
        // If a city has not been clicked and nothing is searched for, populate the list with cities.
        else if (self.coffeeShopList().length == 0 && self.searchValue() == '') {
            if (self.currentRegionList().length == 0) {
                self.filteredList(self.allPlaceList());
            }
            else {
                self.filteredList(self.currentRegionList());
            }
        }
        // Clears the filteredList array and populates it with the names matching the search string.
        else {
            self.filteredList([]);

            // If coffeeShopList is bigger than 0, filter coffeeShopList.
            // Else filter allPlaceList.
            if (self.coffeeShopList().length != 0) {
                self.filterCurrentList(self.coffeeShopList());
                self.getMarkers();
            }
            else {
                if (self.currentRegionList().length == 0) {
                    self.filterCurrentList(self.allPlaceList());
                }
                else {
                    self.filterCurrentList(self.currentRegionList());
                }
            }
        }
        self.idList(self.filteredList());
    }, self);

    /**
      * Filters the selected list.
      * Changes names to lower case for easier filtering.
      * @param currentList - Current list to filter(capital or coffee).
    */
    self.filterCurrentList = function(currentList) {
        var currentListLength = currentList.length;
        var i;

        for (i = 0; i < currentListLength; i++) {
            var name = currentList[i].name().toLowerCase();

            if (name.includes(self.searchValue().toLowerCase())) {
                self.filteredList.push(currentList[i]);
            }
        }
    };

    // Clicking outside the map closes the info window and stops marker animation
    if (map != undefined) {
        map.addListener('click', function() {
            if (self.markerList().length != 0) {
                var markerListLength = self.markerList().length;
                var i;

                for (i = 0; i < markerListLength; i++) {
                    self.markerList()[i].setAnimation(null);
                }
            }
            self.infowindow.close();
        });
    }


    /**
      * Displays correct region list when back button is clicked.
    */
    self.back = function() {
        self.foursquareError(false);
        self.errorMsg('');

        self.searchValue('');

        if (self.hasCoffee()) {
            self.hasCoffee(false);
            self.filteredList(self.currentRegionList());
        }
        else if (self.currentRegionList().length != 0 && self.coffeeShopList().length != 0) {
            self.coffeeShopList([]);
            self.filteredList(self.currentRegionList());
        }
        else {
            self.currentRegionList([]);
            self.coffeeShopList([]);
            self.filteredList(self.allPlaceList());
        }

        self.getMarkers();

        if (self.infowindow != null) {
            self.infowindow.close();
        }
    };

    /**
      * Gets the list of coffee shops for clicked capital.
      * @param index - The index of the clicked capital.
    */
    self.getCoffee = function(index) {
        // If favorites are clicked on and exist, populate arrays with favorites data.
        // Else populate arrays with new capital coffee data.
        if (self.faveBtnClick()) {
            self.faveBtnClick(false);

            var mappedCoffeeShopList = $.map(self.favoritesList(), function(coffee) {
                return new CoffeeShops(coffee);
            });
            self.coffeeShopList(mappedCoffeeShopList);
            self.filteredList(self.coffeeShopList());
            self.searchValue('');
        }
        else if (self.coffeeShopList().length == 0) {
            var cityAddress = self.filteredList()[index].name();

            var foursquareUrl = 'https://api.foursquare.com/v2/venues/explore?near=' + cityAddress + '&section=coffee&limit=25&client_id=' +
                                clientId + '&client_secret=' + clientSecret + '&v=' + version;


            /**
              * Gets data from the Foursquare API.
              * Adds all coffee shops to an array.
              * Displays error message if request fails.
              * @param foursquareUrl - Foursquare URL used for the Ajax request.
              * @param data - Data received from the Foursquare API.
            */
            $.getJSON(foursquareUrl, function(data) {
                    var mappedCoffeeShopList = $.map(data.response.groups[0].items, function(coffee) {
                        return new CoffeeShops(coffee);
                    });
                    self.coffeeShopList(mappedCoffeeShopList);
                    self.filteredList(self.coffeeShopList());
                    self.searchValue('');
                })
                .complete(function() {
                    if (self.coffeeShopList().length == 0) {
                        self.hasCoffee(true);
                    }
                })
                .fail(function() {
                    self.foursquareError(true);
                    self.errorMsg(foursquareErrorMsg);
                });
        }
    };

    /**
      * Gets markers and adds them to a list.
    */
    self.getMarkers = function() {
        var markerListLength = self.markerList().length;
        var i;

        // Clears the markerList array to populate it with new markers.
        for (i = 0; i < markerListLength; i++) {
            self.markerList()[i].setMap(null);
        }
        self.markerList([]);

        if (self.coffeeShopList().length != 0) {
            var filteredListLength = self.filteredList().length;

            // Populates the marker list with corresponding city/filter.
            for (i = 0; i < filteredListLength; i++) {
                var coffeeShopName = self.filteredList()[i].name();
                var coffeeShopId = self.filteredList()[i].venueId();
                var coffeeShopPosition = {
                    lat: self.filteredList()[i].latitude(),
                    lng: self.filteredList()[i].longitude()
                };

                self.markerList().push(new google.maps.Marker({
                    title: coffeeShopName,
                    position: coffeeShopPosition,
                    animation: null,
                    markerId: coffeeShopName + ', ' + coffeeShopId
                }));
            }
        }
        self.markerIcon();
        self.placeMarkers();
    };

    /**
      * Places markers on the map.
    */
    self.placeMarkers = function() {

        // Resets to default map position when no coffee shops are present.
        if (self.coffeeShopList().length == 0) {
            map.setCenter(DEFAULT_CENTER);
            map.setZoom(DEFAULT_ZOOM);
        }
        else {
            var markerListLength = self.markerList().length;
            var i;

            for (i = 0; i < markerListLength; i++) {
                self.markerList()[i].setMap(map);

                self.markerList()[i].addListener('click', (function(markerCopy) {
                    return function() {
                        self.toggleBounce(markerCopy);
                        self.toggleWindow(markerCopy);
                    };
                })(i));
            }
            if (markerListLength != 0) {
                self.setBounds();
            }
        }
    };

    /**
      * Sets the bounds of the map.
    */
    self.setBounds = function() {
        self.latLngList([]);
        self.bounds = new google.maps.LatLngBounds();
        var markerListLength = self.markerList().length;
        var i;

        // Puts the position of all markers into a latLngList array.
        for (i = 0; i < markerListLength; i++) {
            var markerPosition = {
                lat: self.markerList()[i].position.lat(),
                lng: self.markerList()[i].position.lng()
            };
            self.latLngList().push(new google.maps.LatLng(markerPosition));
        }

        var latLntListLength = self.latLngList().length;

        // Uses the marker position in LatLngList to extend the bounds of the map.
        for (i = 0; i < latLntListLength; i++) {
            self.bounds.extend(self.latLngList()[i]);
        }
        map.fitBounds(self.bounds);
    };

    /**
      * Toggles the bouncing motion of the marker.
      * @param index - Index of the clicked marker/list item.
    */
    self.toggleBounce = function(index) {
        var markerListLength = self.markerList().length;
        var i;

        for (i = 0; i < markerListLength; i++) {
            var currentMarker = self.markerList()[i];

            if (i == index && currentMarker.getAnimation() == null) {
                currentMarker.setAnimation(google.maps.Animation.BOUNCE);
            }
            else {
                currentMarker.setAnimation(null);
            }
        }
    };

    /**
      * Toggles the info window.
      * @param index - Index of the clickd marker/list item.
    */
    self.toggleWindow = function(index) {
        var venueError;

        // URL to get complete venue details.
        var venueId = self.idList()[index].venueId();
        var getVenue = '/venues/' + venueId;
        var getHours = '/venues/' + venueId + '/hours';
        var venueIdUrl = 'https://api.foursquare.com/v2/multi?requests=' + getVenue + ',' + getHours +
                         '&client_id=' + clientId + '&client_secret=' + clientSecret + '&v=' + version;

        /**
          * Gets data from the Foursquare API.
          * Triggers default info window content if failed.
          * @param venueIdUrl - Foursquare URL used for the Ajax request.
        */
        $.ajax({
                url: venueIdUrl,
                dataType: 'json',
                success: function(data) {
                    self.currentVenue(data.response.responses[0].response.venue);

                    venueError = false;
                    var i;

                    self.getIwContent(venueError, index);

                    // Complete venue details.
                    var name = self.currentVenue().name;
                    var rating = self.currentVenue().rating;
                    var bestPhoto;
                    var venueHours = data.response.responses[1].response.hours;
                    var venueDescription;
                    var tipCount = self.currentVenue().tips.groups[0].count;
                    var tips;
                    var canonicalUrl = self.currentVenue().canonicalUrl;
                    var phone;
                    var formattedAddress;

                    // Displays venue name.
                    // Adds link if venue has URL.
                    if (self.currentVenue().hasOwnProperty('url')) {
                        var venueUrl = self.currentVenue().url;
                        $('#iw-title').prepend('<a href="' + venueUrl + '" target="_blank">' + name + '</a>');
                    }
                    else {
                        $('#iw-title').prepend(name);
                    }

                    // Displays venue rating.
                    if (rating != undefined) {
                        $('#iw-rating').append(rating + '/10');
                    }
                    else {
                        $('#iw-rating').append('No rating to show.');
                    }

                    // Displays venue best photo.
                    // Doesn't display a photo if height of screen is under 500px.
                    if (self.currentVenue().hasOwnProperty('bestPhoto') && window.matchMedia('(min-height: 500px)').matches) {
                        bestPhoto = self.currentVenue().bestPhoto.prefix + 'original' + self.currentVenue().bestPhoto.suffix;
                    }

                    if (bestPhoto != undefined) {
                        $('#iw-photo').append('<img src="' + bestPhoto + '"style="width:100%; height: auto, display: block">');
                    }
                    else {
                        $('#iw-photo').remove();

                        // Changes the class for hours to center the content.
                        $('#hasPhoto').toggleClass('col-md-5 col-md-12');
                    }

                    // Displays isOpen and status if available.
                    if (self.currentVenue().hasOwnProperty('hours')) {
                        if (self.currentVenue().hours.isOpen == true) {
                            $('#iw-isOpen').prepend('<p>Open Now</p>').css({
                                'color': 'green'
                            });
                        }
                        else {
                            $('#iw-isOpen').prepend('<p>Closed Now</p>').css({
                                'color': 'red'
                            });
                        }

                        if (self.currentVenue().hours.hasOwnProperty('status')) {
                            $('#iw-status').append('<p>' + self.currentVenue().hours.status + '</p>');
                        }
                        else {
                            $('#iw-status').remove();
                        }
                    }
                    else {
                        $('#iw-isOpen').remove();
                    }

                    // Displays venue hours.
                    if (venueHours.hasOwnProperty('timeframes')) {
                        var timeframes = venueHours.timeframes;
                        var timeframesLength = timeframes.length;

                        for (i = 0; i < timeframesLength; i++) {
                            var days = timeframes[i].days;
                            var open = timeframes[i].open;
                            var daysLength = days.length;
                            var j;

                            for (j = 0; j < daysLength; j++) {
                                var day = self.getDay(days[j]);
                                var openLength = open.length;
                                var k;

                                for (k = 0; k < openLength; k++) {
                                    var startTime = self.getTime(open[k].start);
                                    var endTime = self.getTime(open[k].end);

                                    self.appendHours(day, startTime, endTime, k);
                                }
                            }
                        }
                    }
                    else {
                        $('#iw-hours ul').remove();
                        $('#iw-hours').append('<p>No information available</p>');
                    }

                    // Displays description.
                    if (self.currentVenue().hasOwnProperty('description')) {
                        venueDescription = self.currentVenue().description;
                        $('#iw-description').append('<p>About</p>');
                        $('#iw-description').append('<p>' + venueDescription + '</p>');
                    }
                    else {
                        $('#iw-description').remove();
                    }

                    // Displays tips.
                    if (tipCount == 0) {
                        $('#iw-tips').remove();
                    }
                    else {
                        tips = self.currentVenue().tips.groups[0].items;
                        self.getTips(tips);
                        $('#iw-tips').prepend('<p class="hasTips">What others have to say</p>');
                    }

                    // Displays phone number.
                    if (self.currentVenue().contact.hasOwnProperty('formattedPhone')) {
                        phone = self.currentVenue().contact.formattedPhone;
                        $('#iw-phoneIcon').append('<i class="fa fa-phone-square"></i>');
                        $('#iw-phoneNum').append('<p>' + phone + '</p>');
                    }
                    else {
                        $('#iw-phoneIcon').remove();
                        $('#iw-phoneNum').remove();
                    }

                    // Displays Foursquare icon.
                    $('#iw-social').append('<a href="' + canonicalUrl + '" target="_blank"><i class="fa fa-foursquare"></i></a>');

                    // Displays Facebook icon.
                    if (self.currentVenue().contact.hasOwnProperty('facebook')) {
                        var facebookId = self.currentVenue().contact.facebook;
                        $('#iw-social').append('<a href="https://www.facebook.com/' + facebookId + '" target="_blank"><i class="fa fa-facebook-official"></i></a>');
                    }

                    // Displays Twitter icon.
                    if (self.currentVenue().contact.hasOwnProperty('twitter')) {
                        var twitterId = self.currentVenue().contact.twitter;
                        $('#iw-social').append('<a href="https://www.twitter.com/' + twitterId + '" target="_blank"><i class="fa fa-twitter"></i></a>');
                    }

                    // Displays address.
                    if (self.currentVenue().location.hasOwnProperty('formattedAddress')) {
                        var formattedAddressLength = self.currentVenue().location.formattedAddress.length;

                        for (i = 0; i < formattedAddressLength; i++) {
                            formattedAddress = self.currentVenue().location.formattedAddress[i];
                            $('#iw-formattedAddress').append('<p>' + formattedAddress + '</p>');
                        }
                    }

                    self.checkFavorites();
                }
            })
            .fail(function() {
                venueError = true;
                self.getIwContent(venueError, index);
            });

        self.markerAnimation = self.markerList()[index].getAnimation();

        if (self.infowindow != null) {
            self.infowindow.close();
        }

        self.infowindow = new google.maps.InfoWindow({
            pixelOffset: new google.maps.Size(0, -10),
            content: '<div class="container iw-container">' +
                        '<div class="row">' +
                            '<div class="col-md-12 loading">' +
                                '<i class="fa fa-spinner fa-spin"></i>' +
                            '</div>' +
                        '</div>' +
                      '</div>'
        });

        /**
          * Removes info window background shadow.
          * Removes info window white background.
          * Puts a border around the arrow to match the info window style.
        */
        self.infowindow.addListener('domready', function() {
            $('.gm-style-iw').next('div').hide();

            // The following lines of code are taken from a tutorial website, modified to my style.
            // http://en.marnoto.com/2014/09/5-formas-de-personalizar-infowindow.html
            var iwOuter = $('.gm-style-iw');
            var iwBackground = iwOuter.prev();

            iwBackground.children(':nth-child(2)').css({
                'display': 'none'
            });

            iwBackground.children(':nth-child(4)').css({
                'display': 'none'
            });

            iwBackground.children(':nth-child(3)').find('div').children().css({
                'border': '2px solid orange'
            });
        });

        if (self.infowindow != null) {
            self.infowindow.open(map, self.markerList()[index]);
        }

        /**
          * Gets the content of the info window.
          * Reopens window to make all content visible on screen.
          * Makes the star icon clickable.
          * @param venueError - If there was an API error or not.
          * @param index - Index of clicked marker/info window.
          * @param venue - Venue that has been clicked.
        */
        self.getIwContent = function(venueError, index, venue) {
            var contentString;

            if (venueError == false) {
                contentString = '<div class="container iw-container">' + // .container .iw-container
                                    '<div class="row">' +
                                        '<div class="col-md-12" id="iw-title"><i id="favorite" class="fa fa-star"></i></div>' + // #iw-title
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
                                                        '<li id="monExtra"></li>' +
                                                        '<li id="tue"><span>Tuesday</span><div>CLOSED</div></li>' +
                                                        '<li id="tueExtra"></li>' +
                                                        '<li id="wed"><span>Wednesday</span><div>CLOSED</div></li>' +
                                                        '<li id="wedExtra"></li>' +
                                                        '<li id="thu"><span>Thursday</span><div>CLOSED</div></li>' +
                                                        '<li id="thuExtra"></li>' +
                                                        '<li id="fri"><span>Friday</span><div>CLOSED</div></li>' +
                                                        '<li id="friExtra"></li>' +
                                                        '<li id="sat"><span>Saturday</span><div>CLOSED</div></li>' +
                                                        '<li id="satExtra"></li>' +
                                                        '<li id="sun"><span>Sunday</span><div>CLOSED</div></li>' +
                                                        '<li id="sunExtra"></li>' +
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

                self.infowindow.open(map, self.markerList()[index]);

                // If marker animation stops (clicks on marker or list), close info window.
                if (self.markerAnimation == null) {
                    self.infowindow.close();
                }
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

                self.infowindow.open(map, self.markerList()[index]);
            }

            self.infowindow.setContent(contentString);

            $('#favorite').click(function() {
                self.starClick(true);
            });
        };


        /**
          * Turns machine readable day to human readable day.
          * @param dayNumber - The number of the day(1 = Monday, 7 = Sunday).
          * @return Day string corresponding to dayNumber.
        */
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

        /**
          * Turns machine readable time to human readable time.
          * @param time - Machine time.
          * @return Human readable time based on machine time.
        */
        self.getTime = function(time) {
            var firstChar = time.slice(0, 1);
            var hours, minutes, formattedTime;

            // Some firstChar is +, this eliminates problems with that.
            if (firstChar == '+') {
                time = time.slice(1);
            }

            if (time == 1200) {
                return 'Noon';
            }
            else if (time == 0) {
                return 'Midnight';
            }
            else if (time >= 1200) {
                if (time.slice(0, 2) == 12) {
                    hours = time.slice(0, 2);
                }
                else {
                    hours = time.slice(0, 2) - 12;
                }

                minutes = time.slice(2);
                formattedTime = hours + ':' + minutes + ' PM';
                return formattedTime;
            }
            else if (time < 1000) {
                if (time.slice(0, 2) == 0) {
                    hours = '12';
                }
                else {
                    hours = time.slice(1, 2);
                }

                minutes = time.slice(2);
                formattedTime = hours + ':' + minutes + ' AM';
                return formattedTime;
            }
            else {
                if (time.slice(0, 2) == '00') {
                    hours = '12';
                }
                else {
                    hours = time.slice(0, 2);
                }

                minutes = time.slice(2);
                formattedTime = hours + ':' + minutes + ' AM';
                return formattedTime;
            }
        };

        /**
          * Replaces hardcoded data with fetched data.
          * @param day - Human readable day.
          * @param startTime - Human readable startTime.
          * @param endTime - Human readable endTime.
          * @param k - Timeframe number.
        */
        self.appendHours = function(day, startTime, endTime, k) {
            if (k == 0) {
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
            }
            else {
                if (day == 'Monday') {
                    $('#monExtra').replaceWith('<li><span style="visibility:hidden">AND</span><div>' + startTime + ' - ' + endTime + '</div></li>');
                }
                else if (day == 'Tuesday') {
                    $('#tueExtra').replaceWith('<li><span style="visibility:hidden">AND</span><div>' + startTime + ' - ' + endTime + '</div></li>');
                }
                else if (day == 'Wednesday') {
                    $('#wedExtra').replaceWith('<li><span style="visibility:hidden">AND</span><div>' + startTime + ' - ' + endTime + '</div></li>');
                }
                else if (day == 'Thursday') {
                    $('#thuExtra').replaceWith('<li><span style="visibility:hidden">AND</span><div>' + startTime + ' - ' + endTime + '</div></li>');
                }
                else if (day == 'Friday') {
                    $('#friExtra').replaceWith('<li><span style="visibility:hidden">AND</span><div>' + startTime + ' - ' + endTime + '</div></li>');
                }
                else if (day == 'Saturday') {
                    $('#satExtra').replaceWith('<li><span style="visibility:hidden">AND</span><div>' + startTime + ' - ' + endTime + '</div></li>');
                }
                else if (day == 'Sunday') {
                    $('#sunExtra').replaceWith('<li><span style="visibility:hidden">AND</span><div>' + startTime + ' - ' + endTime + '</div></li>');
                }
            }
        };

        /**
          * Fetches tip text and user.
          * @param tips - Array of tips.
        */
        self.getTips = function(tips) {
            var text;
            var firstName;
            var lastName;
            var formattedName;
            var length;
            var i;

            // Max number of tips to display = 5
            if (tips.length > 5) {
                length = 5;
            }
            else {
                length = tips.length;
            }

            for (i = 0; i < length; i++) {
                text = tips[i].text;

                // Determines if the tipper has first and last name.
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

                // Formats the name of the tipper.
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

        /**
          * Appends tips to the screen.
          * Makes sure there's no horizontal rule below last entry.
          * @param text - Text of the tip.
          * @param formattedName - Formatted name of the tipper.
          * @param length - Length of the tips array.
          * @param index - Index of clicked marker/list item.
        */
        self.appendTips = function(text, formattedName, length, index) {
            var formattedTip = '<blockquote>' +
                '<p>' + text + '</p>' +
                '<footer>' + formattedName + '</footer>' +
                '</blockquote>';

            if (length - 1 != index) {
                $('#iw-tips').append(formattedTip + '<hr>');
            }
            else {
                $('#iw-tips').append(formattedTip);
            }
        };
    };

    /**
      * When a list item is clicked, getCoffee.
      * Else toggleBounce.
      * @param index - Index of the clicked list item.
    */
    self.onListClick = function(index) {
        if (self.markerList() == 0) {
            self.getCoffee(index);
        }
        else {
            self.toggleBounce(index);
            self.toggleWindow(index);
        }
    };

    var countryInfoUrl = 'https://restcountries.eu/rest/v1/all';

    /**
      * Gets data from the REST Countries API.
      * Adds all places to an array.
      * Adds different regions to different arrays if completed.
      * Displays error message if failed.
      * @param countryInfoUrl - URL of the REST Countries API.
      * @param data - Data received from the REST Countries API.
    */
    $.getJSON(countryInfoUrl, function(data) {
            var mappedAllPlaceList = $.map(data, function(place) {
                if (place.capital != '' && place.region != '') {
                    return new Place(place);
                }
            });
            self.allPlaceList(mappedAllPlaceList);
        })
        .complete(function() {
            var allPlaceListLength = self.allPlaceList().length;
            var i;

            for (i = 0; i < allPlaceListLength; i++) {
                var currentPlace = self.allPlaceList()[i];

                if (currentPlace.region() == 'Africa') {
                    self.africa().push(currentPlace);
                }
                else if (currentPlace.region() == 'Americas') {
                    self.americas().push(currentPlace);
                }
                else if (currentPlace.region() == 'Asia') {
                    self.asia().push(currentPlace);
                }
                else if (currentPlace.region() == 'Europe') {
                    self.europe().push(currentPlace);
                }
                else if (currentPlace.region() == 'Oceania') {
                    self.oceania().push(currentPlace);
                }
            }
        })
        .fail(function() {
            self.errorMsg(CountriesErrorMessage);
        });
};

/**
  * Initializes the app.
  * @param isMapError - Will display a message if the map has not loaded.
*/
function initialize(isMapError) {
    ko.applyBindings(new ViewModel(isMapError));
}