// window.BA_CUSTOMER = {
//     customer: null,
//     function_tags: {'accepts-frozen-risks': 'accepts-frozen-risks'},

//     init(){

//     },

//     accepts_frozen_risks(){
//         return BA_CUSTOMER.customer
//         ? BA_CUSTOMER.customer.tags.indexOf(BA_CUSTOMER.function_tags["accepts-frozen-risks"]) > -1 
//         : false;
//     },

// };

// var LOCATIONS_MAP = {
//     MAP_API_KEY: 'AIzaSyCdj92JVDyKda9MkRc6IiN8ZUrAdMBnF0k',
//     icons: {},
//     locations: [ ],
//     api: {
//         locations: {

//             all: async function() {
//                 if(LOCATIONS_MAP.locations.length){
//                     return LOCATIONS_MAP.locations;
//                 }else {
//                     return $.get(CART_PAGE.API_ENDPOINT).then(
//                         function(response) {
//                             LOCATIONS_MAP.locations = response;
//                             return response;
//                         });
//                 }
//             },

//         },
//     },

//     init(cart_contains_frozen = false){

//         // Create the map styles.
//         // Create a new StyledMapType object, passing it an array of styles,
//         // and the name to be displayed on the map type control.
//         const styledMapType = new google.maps.StyledMapType(
//             [
//                 {"elementType": "geometry", "stylers": [{"color": "#f5f5f5"}]},
//                 {"elementType": "labels.icon", "stylers": [{"visibility": "off"}]},
//                 {"elementType": "labels.text.fill", "stylers": [{"color": "#616161"}]},
//                 {"elementType": "labels.text.stroke", "stylers": [{"color": "#f5f5f5"}]},

//                 {
//                     "featureType": "administrative.land_parcel",
//                     "elementType": "labels.text.fill",
//                     "stylers": [{"color": "#bdbdbd"}]
//                 },
//                 {"featureType": "landscape.natural", "elementType": "geometry", "stylers": [{"color": "#c4d2c1"}]},
//                 {"featureType": "poi", "elementType": "geometry", "stylers": [{"color": "#eeeeee"}]},
//                 {"featureType": "poi", "elementType": "labels.text.fill", "stylers": [{"color": "#757575"}]},
//                 {"featureType": "poi.park", "elementType": "geometry", "stylers": [{"color": "#e5e5e5"}]},
//                 {"featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{"color": "#9e9e9e"}]},

//                 {"featureType": "road", "elementType": "geometry", "stylers": [{"color": "#ffffff"}]},
//                 {"featureType": "road.arterial", "elementType": "labels.text.fill", "stylers": [{"color": "#757575"}]},
//                 {"featureType": "road.highway", "stylers": [{"color": "#ababab"}]},
//                 {"featureType": "road.highway", "elementType": "geometry", "stylers": [{"color": "#dadada"}]},
//                 {"featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{"color": "#616161"}]},
//                 {"featureType": "road.local", "elementType": "labels.text.fill", "stylers": [{"color": "#9e9e9e"}]},

//                 {"featureType": "transit.line", "elementType": "geometry", "stylers": [{"color": "#e5e5e5"}]},
//                 {"featureType": "transit.station", "elementType": "geometry", "stylers": [{"color": "#eeeeee"}]},

//                 {"featureType": "water", "stylers": [{"color": "#c4dae3"}]},
//                 {"featureType": "water", "elementType": "geometry.fill", "stylers": [{"color": "#cadee8"}]},
//                 {"featureType": "water", "elementType": "labels.text.fill", "stylers": [{"color": "#9e9e9e"}]}
//             ],
//             {name: "Styled Map"}
//         );

//         // Create the map.
//         const map = new google.maps.Map(document.getElementById('map'), {
//             zoom: 7,
//             center: {lat: -27.4698, lng: 153.0251},
//             zoomControl: false,
//             mapTypeControl: false,
//             fullscreenControl: false,
//             streetViewControl: false,
//             scrollwheel: true,

//             mapTypeControlOptions: {
//                 mapTypeIds: ["roadmap", "satellite", "hybrid", "terrain", "styled_map"],
//             },
//         });
//         //Associate the styled map with the MapTypeId and set it to display.
//         map.mapTypes.set("styled_map", styledMapType);
//         map.setMapTypeId("styled_map");

//         // Bounds that will set the maop to contain all markers
//         let bounds = new google.maps.LatLngBounds();

//               var additionalLocations = [
//             { 
//                 'name': 'Rocklea',
//                 'map_location': { lat: -27.56246515828876, lng:152.99709865}, // 
//                 'frozen': true, 
//                 'address':'34 Reginald Street, Rocklea 4106, Australia',
//                 'hours': ['Thursday PICKUP 9am - 1pm','Friday PICKUP 9am -12pm'],
//                 'pickup-information': 'Collect from front office'
//             },
//             { 
//                 'name': 'Kallangur',
//                 'map_location': { lat: -27.253361127677252, lng: 152.98239196556398}, //
//                 'frozen': false,
//                 'address':'52 Melinda Court, Kallangur, 4503, Australia',
//                 'hours': 'Friday PICKUP 11am - 3pm',
//                 'pickup-information': 'In the carport'
//             }

                           
//         ];

       
//         LOCATIONS_MAP.locations = LOCATIONS_MAP.locations.concat(additionalLocations);
       
//         LOCATIONS_MAP.locations.forEach(function(l, i) {
//             // Add Marker
//             LOCATIONS_MAP.locations[i].marker = new google.maps.Marker({
//                 position: l.map_location, // Brooklyn Coordinates
//                 map: map, //Map that we need to add
//                 // Disabled above so icon will always show. Will
//                 icon: l.frozen ? LOCATIONS_MAP.icons.frozen : LOCATIONS_MAP.icons.non_frozen,
//                 draggable: false// If set to true you can drag the marker,
//             });

//             bounds.extend(LOCATIONS_MAP.locations[i].marker.position);
//             // Add closure for onClick Listener to marker
//             (function(location, marker, index) {
//                 google.maps.event.addListener(marker, "click", function(e) {
//                     let content =
//                         `<div class="info-location" data-enabled="${BA_CUSTOMER.accepts_frozen_risks() || !(cart_contains_frozen && !l.frozen)}">
//                             <div class="info-header">
//                                 <div class="header-content">
//                                     <div class="title">${location.name ?? ''}</div>
//                                     <div class="frozen" style="${location.frozen ? '' : 'display: none;'}">Onsite Freezer</div>
//                                     <div class="tel"><a href="tel:${location.tel}">${location.tel ?? ''}</a></div>
//                                 </div>
//                             </div>
//                             <div class="info-content">
//                                 <div class="description">${location.description ?? ''}</div>
//                                 <div class="address">${location.address ?? ''}</div>
//                                 <div class="hours">${location.hours ?? ''}</div>
//                             </div>
//                             <div class="info-footer">
//                                 <button ${!BA_CUSTOMER.accepts_frozen_risks() && (cart_contains_frozen && !l.frozen) ? 'disabled' : ''} class="info-btn info-btn--select-location btn to-confirm-step" data-location-index="${index}" data-location-name="${location.name}">SELECT</button>
//                             </div>
//                         </div>`;
//                     infoWindow.setContent(content);
//                     infoWindow.open(map, marker);
//                 });
//             })(l, LOCATIONS_MAP.locations[i].marker, i);

//         });

//         map.fitBounds(bounds);

//         const infoWindow = new google.maps.InfoWindow();

//         // Build and add the search bar
//         const card = document.createElement('div');
//         const titleBar = document.createElement('div');
//         const title = document.createElement('div');
//         const container = document.createElement('div');
//         const input = document.createElement('input');
//         const options = {
//             types: ['(regions)'],
//             componentRestrictions: {country: 'au'},
//         };

//         card.setAttribute('id', 'pac-card');
//         title.setAttribute('id', 'title');
//         title.textContent = '';
//         titleBar.appendChild(title);
//         container.setAttribute('id', 'pac-container');
//         input.setAttribute('id', 'pac-input');
//         input.setAttribute('type', 'text');
//         input.setAttribute('placeholder', 'Enter a suburb');
//         container.appendChild(input);
//         card.appendChild(titleBar);
//         card.appendChild(container);
//         map.controls[google.maps.ControlPosition.TOP_CENTER].push(card);

//         const autocomplete = new google.maps.places.Autocomplete(input, options);

//         autocomplete.setFields(
//             ['address_components', 'geometry', 'name']);

//         // Set the origin point when the user selects an address

//         autocomplete.addListener('place_changed', async function() {

//             const place = autocomplete.getPlace();

//             if (!place.geometry) {
//                 return;
//             }

//             map.fitBounds(place.geometry.viewport);

//         });
//     },
// };

// fetch('https://api-us.zapiet.com/v1.0/pickup/locations?shop=sprayfreefarmacy.myshopify.com')
// 	.then(response => response.json())
// 	.then(data => console.log(data))
// 	.catch(err => console.error(err));