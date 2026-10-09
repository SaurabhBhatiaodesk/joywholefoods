window.BA_CUSTOMER = {
    customer: null,
    function_tags: {'accepts-frozen-risks': 'accepts-frozen-risks'},

    init(){

    },

    accepts_frozen_risks(){
        return BA_CUSTOMER.customer
        ? BA_CUSTOMER.customer.tags.indexOf(BA_CUSTOMER.function_tags["accepts-frozen-risks"]) > -1 
        : false;
    },

};

var LOCATIONS_MAP = {
    MAP_API_KEY: 'AIzaSyCdj92JVDyKda9MkRc6IiN8ZUrAdMBnF0k',
    icons: {},
    locations: [ ],
    api: {
        locations: {

            all: async function() {
                if(LOCATIONS_MAP.locations.length){
                    return LOCATIONS_MAP.locations;
                }else {
                    return $.get(CART_PAGE.API_ENDPOINT).then(
                        function(response) {
                            LOCATIONS_MAP.locations = response;
                            return response;
                        });
                }
            },

        },
    },

    init(cart_contains_frozen = false){

        // Create the map styles.
        // Create a new StyledMapType object, passing it an array of styles,
        // and the name to be displayed on the map type control.
        const styledMapType = new google.maps.StyledMapType(
            [
                {"elementType": "geometry", "stylers": [{"color": "#f5f5f5"}]},
                {"elementType": "labels.icon", "stylers": [{"visibility": "off"}]},
                {"elementType": "labels.text.fill", "stylers": [{"color": "#616161"}]},
                {"elementType": "labels.text.stroke", "stylers": [{"color": "#f5f5f5"}]},

                {
                    "featureType": "administrative.land_parcel",
                    "elementType": "labels.text.fill",
                    "stylers": [{"color": "#bdbdbd"}]
                },
                {"featureType": "landscape.natural", "elementType": "geometry", "stylers": [{"color": "#c4d2c1"}]},
                {"featureType": "poi", "elementType": "geometry", "stylers": [{"color": "#eeeeee"}]},
                {"featureType": "poi", "elementType": "labels.text.fill", "stylers": [{"color": "#757575"}]},
                {"featureType": "poi.park", "elementType": "geometry", "stylers": [{"color": "#e5e5e5"}]},
                {"featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{"color": "#9e9e9e"}]},

                {"featureType": "road", "elementType": "geometry", "stylers": [{"color": "#ffffff"}]},
                {"featureType": "road.arterial", "elementType": "labels.text.fill", "stylers": [{"color": "#757575"}]},
                {"featureType": "road.highway", "stylers": [{"color": "#ababab"}]},
                {"featureType": "road.highway", "elementType": "geometry", "stylers": [{"color": "#dadada"}]},
                {"featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{"color": "#616161"}]},
                {"featureType": "road.local", "elementType": "labels.text.fill", "stylers": [{"color": "#9e9e9e"}]},

                {"featureType": "transit.line", "elementType": "geometry", "stylers": [{"color": "#e5e5e5"}]},
                {"featureType": "transit.station", "elementType": "geometry", "stylers": [{"color": "#eeeeee"}]},

                {"featureType": "water", "stylers": [{"color": "#c4dae3"}]},
                {"featureType": "water", "elementType": "geometry.fill", "stylers": [{"color": "#cadee8"}]},
                {"featureType": "water", "elementType": "labels.text.fill", "stylers": [{"color": "#9e9e9e"}]}
            ],
            {name: "Styled Map"}
        );

        // Create the map.
        const map = new google.maps.Map(document.getElementById('map'), {
            zoom: 7,
            center: {lat: -27.4698, lng: 153.0251},
            zoomControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
            streetViewControl: false,
            scrollwheel: true,

            mapTypeControlOptions: {
                mapTypeIds: ["roadmap", "satellite", "hybrid", "terrain", "styled_map"],
            },
        });
        //Associate the styled map with the MapTypeId and set it to display.
        map.mapTypes.set("styled_map", styledMapType);
        map.setMapTypeId("styled_map");

        // Bounds that will set the maop to contain all markers
        let bounds = new google.maps.LatLngBounds();

        var additionalLocations = [
            { 
                'name': 'Rocklea',
                'map_location': { lat: -27.56246515828876, lng:152.99709865}, // 
                'frozen': true, 
                'address':'34 Reginald Street, Rocklea 4106, Australia',
                'hours': ['Thursday PICKUP 9am - 1pm','Friday PICKUP 9am -12pm'],
                'pickup-information': 'Collect from front office'
            },
            { 
                'name': 'Kallangur',
                'map_location': { lat: -27.253361127677252, lng: 152.98239196556398}, //
                'frozen': false,
                'address':'52 Melinda Court, Kallangur, 4503, Australia',
                'hours': 'Friday PICKUP 11am - 3pm',
                'pickup-information': 'In the carport'
            },
            {
                'name': 'Flagstone',
                'map_location': { lat: -27.4085, lng: 153.0315 },
                'frozen': false,
                'address':'23 Eddowes St, Kedron QLD 4031',
                'hours': 'Thursday from 12noon to 4pm',
                'pickup-information': 'Collect from front porch'
            },
            {
                "name": "Kedron",
                "map_location": { "lat": -27.4048005, "lng": 153.0284884 },
                "frozen": false,
                "address": "23 Eddowes St, Kedron QLD 4031",
                "hours": "Wednesday"
            },
            {
                "name": "Dayboro",
                "map_location": { "lat": -27.1963, "lng": 152.8225 },
                "frozen": false,
                "address": "3468 Mount Mee Rd, Dayboro QLD 4521",
                "hours": "Friday"
            },
            {
                "name": "EDENS LANDING",
                "map_location": {
                    "lat": -27.7027,
                    "lng": 153.1694
                },
                "frozen": false,
                "address": "10 Jonath Court, Edens Landing QLD 4207, Australia",
                "hours": "THURSDAY"
            },
            {
              "name": "Balmoral ",
              "map_location": { "lat": -27.45341, "lng": 153.06680 },
              "frozen": false,
              "address": "3 Walkers Drive, Balmoral, QLD 4171",
              "hours": "SATRUDAY"
            },  
            {
              "name": "Samford Valley Steiner School",
              "map_location": { "lat": -27.394288, "lng": 152.856369 },
              "frozen": false,
              "address": "5 Narrawa Rd, Wights Mountain, QLD 4520",
              "hours": "FRIDAY"
            },    
            {
              "name": "Sadliers Crossing",
              "map_location": { "lat": -27.611524, "lng": 152.744337 },
              "frozen": false,
              "address": "23 Ferrett St, Sadliers Crossing QLD 4305",
              "hours": "THURSDAY"
            },
            {
              "name": "Bribie Island",
              "map_location": { "lat": -27.0651898, "lng": 153.0658683 },
              "frozen": false,
              "address": "10 Aylward Rd, Ningi QLD 4511, Australia",
              "hours": "Friday",
              "pickup-information": "Min. order $100 for pickup"
            },
            {
              "name": "Pimpama",
              "map_location": { "lat": -27.8270286, "lng": 153.3040552 },
              "frozen": false,
              "address": "48/7 Angela Way, Pimpama QLD 4209, Australia",
              "hours": "Thursday",
              "pickup-information": "12:30 - 3:30pm"
            }
        ];

       
        LOCATIONS_MAP.locations = LOCATIONS_MAP.locations.concat(additionalLocations);


      /* custom fix to remove 'Nudgee', 'Ormeau', 'Nerang', 'Dayboro', 'Redland Bay' start */
      // let filteredLocations = LOCATIONS_MAP.locations.filter(filteredLocations =>
      //     !["Nudgee", "Ormeau Hills", "Nerang", "Redland Bay", "Flagstone", "Eatons Hill", "Coomera", "Canungra","Ashgrove", "New Farm (Jan Powers Markets)", "Sandgate (Farmer's Market)", "Norman Park" ].includes(filteredLocations.name)
      // );
      // LOCATIONS_MAP.locations = filteredLocations;

      // code changes by os starts
      let filteredLocations = LOCATIONS_MAP.locations.filter(location => {
        const excludedNames = [
          "Nudgee", "Ormeau", "Ormeau Hills", "Nerang", "Redland Bay", "Flagstone",
          "Coomera", "Canungra", "Ashgrove",
          "New Farm (Jan Powers Markets)", "Sandgate (Farmer's Market)",
          "Norman Park", "Kenmore","Brassall","Kallangur","Sadliers Crossing","Samford Valley","Annerley"
        ];
      
        // Remove only the specific Dayboro with exact address and hours
        const isUnwantedDayboro =
          location.name === "Dayboro" &&
          location.address === "3468 Mount Mee Rd, Dayboro QLD 4521" &&
          location.hours === "Friday";
      
        return !excludedNames.includes(location.name) && !isUnwantedDayboro;
      });
      
      LOCATIONS_MAP.locations = filteredLocations;

      // Clean up location names to remove "(City Chicks)"
      LOCATIONS_MAP.locations.forEach(location => {
        if (location.name) {
          location.name = location.name.replace(/\s*\(City Chicks\)/gi, "").trim();
        }
      });

      // LOCATIONS_MAP.locations.forEach(loc => {
      //   console.log("loc :::", loc);
      //   console.log("loc.name :::", loc.name);
      // });
      
      // code changes by os ends

      /* custom fix to remove 'Nudgee', 'Ormeau', 'Nerang', 'Redland Bay' end */


      
      /* custom fix to update location of 'Norman Park' start */
        for (var i = 0; i < LOCATIONS_MAP.locations.length; i++) {
            if (LOCATIONS_MAP.locations[i].name == "Norman Park") {
                LOCATIONS_MAP.locations[i].address = "44 Tennyson St Norman Park 4170, Australia";
                LOCATIONS_MAP.locations[i].address_json.formatted_address = "44 Tennyson St Norman Park 4170, Australia";
            }
            if (LOCATIONS_MAP.locations[i].name == "Samford") {
                LOCATIONS_MAP.locations[i].address = "6 Church Street, Samford Village";
            }
            if (LOCATIONS_MAP.locations[i].name == "Wooloowin") {
                LOCATIONS_MAP.locations[i].hours = "WEDNESDAY";
            }
            if (LOCATIONS_MAP.locations[i].name == "Wynnum") {
                LOCATIONS_MAP.locations[i].address = "1/203 Randall Road, Wynnum West";
            }
            if (LOCATIONS_MAP.locations[i].name == "Rocklea") {
                LOCATIONS_MAP.locations[i].hours = "Tuesday, Wednesday, or Thursday";
                LOCATIONS_MAP.locations[i]['pickup-information'] = "Collect from front porch"; // Ensure this updates correctly
            }
            if (LOCATIONS_MAP.locations[i].name == "Taringa") {
                LOCATIONS_MAP.locations[i].hours = "WEDNESDAY"; // Ensure to update correctly
              console.log("Taringa location found --------");
            }
            if (LOCATIONS_MAP.locations[i].name == "Eatons Hill") {
                LOCATIONS_MAP.locations[i].hours = "Friday"; 
            }
        }


        LOCATIONS_MAP.locations.forEach(function (location) {
            const weekdayRegex = /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i;
        
            if (typeof location.hours === "string") {
                const dayMatch = location.hours.match(weekdayRegex);
                if (dayMatch) {
                    location.hours = dayMatch[0];
                }
            } else if (Array.isArray(location.hours)) {
                const daysOnly = location.hours.map(h => {
                    const match = h.match(weekdayRegex);
                    return match ? match[0] : '';
                });
                location.hours = [...new Set(daysOnly.filter(Boolean))].join(', ');
            }
        });

        // Update pickup days
        LOCATIONS_MAP.locations.forEach(function (location) {
            if (["Alderley", "Kenmore", "Kedron", "Forest Lake", "Pullenvale (Brisbane Independent School)"].includes(location.name)) {
                location.hours = "Thursday";
            } 
            // else if (location.name === "Wooloowin") { // Condition to show 'WEDNESDAY and SATURDAY' for 'Wooloowin'
            //     location.hours = "WEDNESDAY and SATURDAY";
            // }
        });
      
      
        LOCATIONS_MAP.locations.forEach(function(l, i) {
            // Add Marker
           LOCATIONS_MAP.locations[i].marker = new google.maps.Marker({
                position: l.map_location, // Brooklyn Coordinates
                map: map, //Map that we need to add
                // Disabled above so icon will always show. Will
                icon: l.frozen ? LOCATIONS_MAP.icons.frozen : LOCATIONS_MAP.icons.non_frozen,
                draggable: false// If set to true you can drag the marker,
            });


          

          
        // removed from bottom markup: <div class="frozen" style="${location.frozen ? '' : 'display: none;'}">Onsite Freezer</div>
          
          bounds.extend(LOCATIONS_MAP.locations[i].marker.position);
            // Add closure for onClick Listener to marker
            (function(location, marker, index) {
                google.maps.event.addListener(marker, "click", function(e) {
                    let content =
                        `<div class="info-location" data-enabled="${BA_CUSTOMER.accepts_frozen_risks() || !(cart_contains_frozen && !l.frozen)}">
                            <div class="info-header">
                                <div class="header-content">
                                    <div class="title">${location.name ?? ''}</div>
                                    <div class="tel"><a href="tel:${location.tel}">${location.tel ?? ''}</a></div>
                                </div>
                            </div>
                            <div class="info-content">
                                <div class="description">${location.description ?? ''}</div>
                                <div class="address">${location.address ?? ''}</div>
                                <div class="hours">${location.hours ?? ''}</div>
                            </div>
                            <div class="info-footer">
                                <button ${!BA_CUSTOMER.accepts_frozen_risks() && (cart_contains_frozen && !l.frozen) ? 'disabled' : ''} class="info-btn info-btn--select-location btn to-confirm-step" data-location-index="${index}" data-location-name="${location.name}">SELECT</button>
                            </div>
                        </div>`;
                    infoWindow.setContent(content);
                    infoWindow.open(map, marker);
                });
            })(l, LOCATIONS_MAP.locations[i].marker, i);

        });

        map.fitBounds(bounds);

        const infoWindow = new google.maps.InfoWindow();

        // Build and add the search bar
        const card = document.createElement('div');
        const titleBar = document.createElement('div');
        const title = document.createElement('div');
        const container = document.createElement('div');
        const input = document.createElement('input');
        const options = {
            types: ['(regions)'],
            componentRestrictions: {country: 'au'},
        };

        card.setAttribute('id', 'pac-card');
        title.setAttribute('id', 'title');
        title.textContent = '';
        titleBar.appendChild(title);
        container.setAttribute('id', 'pac-container');
        input.setAttribute('id', 'pac-input');
        input.setAttribute('type', 'text');
        input.setAttribute('placeholder', 'Enter a suburb');
        container.appendChild(input);
        card.appendChild(titleBar);
        card.appendChild(container);
        map.controls[google.maps.ControlPosition.TOP_CENTER].push(card);

        const autocomplete = new google.maps.places.Autocomplete(input, options);

        autocomplete.setFields(
            ['address_components', 'geometry', 'name']);

        // Set the origin point when the user selects an address

        autocomplete.addListener('place_changed', async function() {

            const place = autocomplete.getPlace();

            if (!place.geometry) {
                return;
            }

            map.fitBounds(place.geometry.viewport);

        });
    },
};

fetch('https://api-us.zapiet.com/v1.0/pickup/locations?shop=sprayfreefarmacy.myshopify.com')
	.then(response => response.json())
	.then(data => console.log(data))
	.catch(err => console.error(err));
