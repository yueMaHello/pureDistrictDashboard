var button = document.createElement('button');
var textNode = document.createTextNode('Click Me!');
button.appendChild(textNode);
button.className = 'mdl-button mdl-js-button mdl-js-ripple-effect';
componentHandler.upgradeElement(button);

var data = {
    'incomeMatrix':null,
    'autoOwnerShipMatrix':null,
    'districtMatrix':null,
    'totalVKTMatrix':null,
    'averageVKTMatrix':null,
    'populationMatrix':null,
    'employmentMatrix':null

};
var q = d3.queue();
q.defer(d3.csv,'./data/income_by_district.csv')
    .defer(d3.csv,'./data/autoOwnerShip_by_district.csv')
    .defer(d3.csv,'./data/mode_by_district.csv')
    .defer(d3.csv,"./data/totalVKT_by_district.csv")
    .defer(d3.csv, './data/averageVKT_by_district.csv')
    .defer(d3.csv,'./data/population_by_district.csv')
    .defer(d3.csv,'./data/employment_by_district.csv')
    .await(main);

function main(error,income,autoOwnership,district,totalVKT,averageVKT,population,employment){
    data.incomeMatrix = buildMatrixLookup(income);
    data.autoOwnerShipMatrix = buildMatrixLookup(autoOwnership);
    data.districtMatrix = buildMatrixLookup(district);
    data.totalVKTMatrix = buildMatrixLookup(totalVKT);
    data.averageVKTMatrix = buildMatrixLookup(averageVKT);
    data.populationMatrix = buildMatrixLookup(population);
    data.employmentMatrix = buildMatrixLookup(employment);
}
var randomColorArray = ['#FF6633', '#FFB399', '#FF33FF', '#FFFF99', '#00B3E6',
    '#E6B333', '#3366E6', '#999966', '#99FF99', '#B34D4D',
    '#80B300', '#809900', '#E6B3B3', '#6680B3', '#66991A',
    '#FF99E6', '#CCFF1A', '#FF1A66', '#E6331A', '#33FFCC',
    '#66994D', '#B366CC', '#4D8000', '#B33300', '#CC80CC',
    '#66664D', '#991AFF', '#E666FF', '#4DB3FF', '#1AB399',
    '#E666B3', '#33991A', '#CC9999', '#B3B31A', '#00E680'];

require([
    "esri/map",  "dojo/dom-construct",
    "esri/layers/FeatureLayer",
    "esri/dijit/Popup",
    "esri/dijit/Legend","esri/symbols/SimpleLineSymbol","esri/InfoTemplate",
    "dojo/domReady!"
], function(Map, domConstruct,FeatureLayer, Popup, Legend,SimpleLineSymbol,InfoTemplate
) {


    var map = new Map("mapDiv", {
        basemap: "gray-vector",
        center: [-113.4909, 53.5444],
        zoom: 8,
        minZoom:6,

    });

    var districtLayer = new FeatureLayer("https://services8.arcgis.com/FCQ1UtL7vfUUEwH7/arcgis/rest/services/district1669/FeatureServer/0",{
        mode: FeatureLayer.MODE_SNAPSHOT,
        outFields: ["*"],
        infoTemplate:new InfoTemplate("Attributes", "${*}")


    });
    //LRT layer
    var lrtFeatureLayer = new FeatureLayer("https://services8.arcgis.com/FCQ1UtL7vfUUEwH7/arcgis/rest/services/LRT/FeatureServer/0",{
        mode: FeatureLayer.MODE_SNAPSHOT,
        outFields: ["*"],
    });

    map.on('load',function(){
        map.addLayer(districtLayer);
        map.addLayer(lrtFeatureLayer);
    });
    var incomeChart;
    var modeChart;
    var autoChart;


    districtLayer.on('click',function(e){
        let selectedZone;
        selectedZone = e.graphic.attributes["District"];
        var incomeLine = data.incomeMatrix[selectedZone];
        var autoLine = data.autoOwnerShipMatrix[selectedZone];
        var modeLine = data.districtMatrix[selectedZone];
        // Draw the chart and set the chart values
        // Load google charts
        $('#TotalVKTNumber').text(Number(data.totalVKTMatrix[selectedZone]['TotalVKT']).toFixed(2));
        $('#AverageVKTNumber').text(Number(data.averageVKTMatrix[selectedZone]['AverageVKT']).toFixed(2));
        $('#PopulationNumber').text(data.populationMatrix[selectedZone]['Population']);
        $('#EmploymentNumber').text(data.employmentMatrix[selectedZone]['Jobs']);
        // Draw the chart and set the chart values
        drawChart(incomeLine,autoLine,modeLine);

    })
});

function drawChart(incomeLine,autoLine,modeLine) {
    if(typeof(incomeChart)!=='undefined'){
        incomeChart.destroy();
        modeChart.destroy();
        autoChart.destroy();
    }

    var incomeArray = new Array();
    for (var key in incomeLine) {
        incomeArray.push([key,parseFloat(incomeLine[key])]);
    }
    var [k,v]= getKeysValuesOfObject(incomeArray);
    var incomeData= {
        datasets: [{
            data:v,
            backgroundColor:randomColorArray
        }],
        labels:k,
    };

    var incomeCtxL = document.getElementById("piechart").getContext('2d');
    incomeChart = new Chart(incomeCtxL, {
        type: 'pie',
        data:incomeData,
        options: {
            responsive: true,
            legend: {
                display: true,
                position: 'right',
                labels: {
                    fontColor: 'white'
                }
            },
            responsive: true

        }
    });

    var autoArray = new Array();
    for (var key in autoLine) {
        autoArray.push([key,parseFloat(autoLine[key])]);
    }
    var [k,v]= getKeysValuesOfObject(autoArray);

    var autoData= {
        datasets: [{
            data:v,
            backgroundColor:randomColorArray
        }],
        labels:k,
    };

    var autoCtxL = document.getElementById("piechart1").getContext('2d');
    autoChart = new Chart(autoCtxL, {
        type: 'doughnut',
        data:autoData,
        options: {
            responsive: true,
            legend: {
                display: true,
                position: 'right',
                labels: {
                    fontColor: 'white'
                }
            }
        }
    });

    var modeArray = new Array();
    for (var key in modeLine) {
        modeArray.push([key,parseFloat(modeLine[key])]);
    }
    var [k,v]= getKeysValuesOfObject(modeArray);
    var modeData= {
        datasets: [{
            data:v,
            backgroundColor:randomColorArray
        }],
        labels:k,
    };
    var modeCtxL = document.getElementById("piechart2").getContext('2d');
    modeChart = new Chart(modeCtxL, {
        type: 'bar',
        data:modeData,
        options: {
            responsive: true,
            legend: {
                display: false,
                position: 'right',
                labels: {
                    fontColor: 'white'
                }
            }
        }
    });
}
function buildMatrixLookup(arr) {
    var lookup = {};
    //var indexCol = arr[0]
    //console.log(indexCol);
    arr.forEach(row => {
        let ind = row["District"];
        delete row["District"];
        lookup[ind] = row;
    });

    return lookup;
}
function getKeysValuesOfObject(obj){
    var keys = [];
    var values = [];
    for(var k in obj){
        keys.push(obj[k][0]);
        values.push(obj[k][1]);
    }
    return [keys,values];

}