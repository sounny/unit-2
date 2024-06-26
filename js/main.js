//declare vars in global scope
var map;
var minValue;
var attributes;

//function to create map
function createMap() {

    //create the map
    map = L.map('map', {
        center: [45, -94],
        zoom: 3
    });

    //add base tilelayer
    L.tileLayer('https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}{r}.{ext}', {
        minZoom: 0,
        maxZoom: 20,
        attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        ext: 'png'
    }).addTo(map);

    //call getData function
    getData();
};

function calculateMinValue(data) {
    //create empty array to store all data values
    var allValues = [];
    //loop through each city
    for (var city of data.features) {
        //loop through each year
        for (var year = 1960; year <= 2020; year += 10) {
            //get dew point for current year
            var value = city.properties["dp_" + String(year)];
            //add value to array
            allValues.push(value);
        }
    }
    //get minimum value of our array
    var minValue = Math.min(...allValues)

    return minValue;
}

//calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
    //constant factor adjusts symbol sizes evenly
    var minRadius = 5;
    //Flannery Apperance Compensation formula
    var radius = 1.0083 * Math.pow(attValue / minValue, 0.5715) * minRadius

    return radius;
};

//function to convert markers to circle markers
function pointToLayer(feature, latlng, attributes) {

    //Determine the attribute for scaling the proportional symbols
    var attribute = attributes[0];

    //create marker options
    var geojsonMarkerOptions = {
        fillColor: "#00827D",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.75
    };

    //For each feature, determine its value for the selected attribute
    var attValue = Number(feature.properties[attribute]);

    //Give each feature's circle marker a radius based on its attribute value
    geojsonMarkerOptions.radius = calcPropRadius(attValue);

    //create circle markers
    var layer = L.circleMarker(latlng, geojsonMarkerOptions);

    //build popup content string starting with city...Example 2.1 line 24
    var popupContent = "<p><b>City:</b> " + feature.properties.City + "</p>";

    //add formatted attribute to popup content string
    var year = attribute.split("_")[1];
    popupContent += "<p><b>Average dew point in " + year + ":</b> " + feature.properties[attribute] + "°F</p>";

    //bind the popup to the circle marker
    layer.bindPopup(popupContent, {
        offset: new L.Point(0, -geojsonMarkerOptions.radius / 2)
    });

    //return the circle marker to the L.geoJson pointToLayer option
    return layer;

};

//Add circle markers for point features to the map
function createPropSymbols(data, attributes) {

    //create a Leaflet GeoJSON layer and add it to the map
    L.geoJson(data, {
        pointToLayer: function (feature, latlng) {
            return pointToLayer(feature, latlng, attributes);
        }
    }).addTo(map);
};

//Resize proportional symbols according to new attribute values
function updatePropSymbols(attribute) {
    map.eachLayer(function (layer) {
        if (layer.feature && layer.feature.properties[attribute]) {
            //access feature properties
            var props = layer.feature.properties;

            //update each feature's radius based on new attribute values
            var radius = calcPropRadius(props[attribute]);
            layer.setRadius(radius);

            //add city to popup content string
            var popupContent = "<p><b>City:</b> " + props.City + "</p>";

            //add formatted attribute to panel content string
            var year = attribute.split("_")[1];
            popupContent += "<p><b>Average dew point in " + year + ":</b> " + props[attribute] + "°F</p>";

            //update popup content            
            popup = layer.getPopup();
            popup.setContent(popupContent).update();
        };
    });
};

//Create new sequence controls
function createSequenceControls() {

    //create range input element (slider)
    var slider = "<input class='range-slider' type='range'></input>";
    document.querySelector("#panel").insertAdjacentHTML('beforeend', slider);

    //set slider attributes
    document.querySelector(".range-slider").max = 6;
    document.querySelector(".range-slider").min = 0;
    document.querySelector(".range-slider").value = 0;
    document.querySelector(".range-slider").step = 1;
    document.querySelector('#panel').insertAdjacentHTML('beforeend', '<button class="step" id="reverse"></button>');
    document.querySelector('#panel').insertAdjacentHTML('beforeend', '<button class="step" id="forward"></button>');
    document.querySelector('#reverse').insertAdjacentHTML('beforeend', "<img src='img/reverse.png'>");
    document.querySelector('#forward').insertAdjacentHTML('beforeend', "<img src='img/forward.png'>");

    //click listener for buttons
    document.querySelectorAll('.step').forEach(function (step) {
        step.addEventListener("click", function () {
            var index = document.querySelector('.range-slider').value;

            //increment or decrement depending on button clicked
            if (step.id == 'forward') {
                index++;
                //if past the last attribute, wrap around to first attribute
                index = index > 6 ? 0 : index;
            } else if (step.id == 'reverse') {
                index--;
                //if past the first attribute, wrap around to last attribute
                index = index < 0 ? 6 : index;
            };

            //update slider
            document.querySelector('.range-slider').value = index;

            //pass new attribute to update symbols
            updatePropSymbols(attributes[index]);
        })
    });

    //input listener for slider
    document.querySelector('.range-slider').addEventListener('input', function () {
        //get the new index value
        var index = this.value;

        //pass new attribute to update symbols
        updatePropSymbols(attributes[index]);
    });
};

//build an attributes array from the data
function processData(data) {
    //empty array to hold attributes
    attributes = [];

    //properties of the first feature in the dataset
    var properties = data.features[0].properties;

    //push each attribute name into attributes array
    for (var attribute in properties) {
        //only take attributes with population values
        if (attribute.indexOf("dp") > -1) {
            attributes.push(attribute);
        };
    };

    return attributes;
};

//Import GeoJSON data
function getData() {

    //load the data
    fetch("data/dewPointCities.geojson")
        .then(function (response) {
            return response.json();
        })
        .then(function (json) {
            //update the global attributes array
            attributes = processData(json);
            //calculate minimum data value
            minValue = calculateMinValue(json);
            //call function to create proportional symbols
            createPropSymbols(json, attributes);
            //call function to create sequence controls
            createSequenceControls();
        })
};

document.addEventListener('DOMContentLoaded', createMap)
