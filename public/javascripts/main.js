/***
 * main.js is used to plot and control the charts and map.
 * When the user clicks on a travel zone, the charts will change correspondingly.
 * The webpage layout is coded in './views/index.html' and './public/stylesheets/style.css'.
 * If you want to change the position of the charts, it is quite simple and I will explain it in 'index.html'
 */
let tripsDataset; //store ./outputData/output.json
let popEmpDataset;//store ./data/RTM3_Emp_2015.csv
let populationBreakdown;//store ./data/Population_2015_RTM3.csv
let dwellingTypeDataset; //store ./data/DwellingType_2015_RTM3.csv
let selectedZone = '1';//store the zone being selected, default zone is '101'
let professionalTravelModeChart = false;
let selectedDistrictLayer;
//attribute.District. If you change the district layer's attribute name, this variable should be changed correspondingly
let districtLayerAttributeID = 'District';
// let zoneToDistrict;
//If trips_1.csv uses other categories (not 'P','C','W'....'S'), the dictionary should be edited correspondingly
let purposeDict = {
    'P':'Personal Business',
    'C':'Escort',
    'W':'Work',
    'L':'Social',
    'H':'Shop',
    'R':'Recreation',
    'Q':'Quick Stop',
    'S':'School',
};
//If trips_1.csv uses other categories (not 'Lo','Med','Hi'), the dictionary should be edited correspondingly
let incomeDict = {
    'Lo':'Low',
    'Med':'Medium',
    'Hi':'High'
};
require([
    "esri/map","dojo/dom-construct", "esri/layers/FeatureLayer",
    "esri/dijit/Popup", "esri/dijit/Legend","esri/symbols/SimpleLineSymbol",
    "esri/InfoTemplate", "esri/symbols/SimpleFillSymbol", "esri/renderers/ClassBreaksRenderer",
    "esri/symbols/SimpleMarkerSymbol","esri/layers/GraphicsLayer","esri/graphic", "esri/Color", "dojo/domReady!"
], function(Map, domConstruct,FeatureLayer, Popup, Legend,SimpleLineSymbol,InfoTemplate,SimpleFillSymbol,ClassBreaksRenderer,SimpleMarkerSymbol,GraphicsLayer,Graphic,Color
) {
    //D3 read json and csv files

    d3.queue().defer(d3.json,'./outputData/output.json')
              .defer(d3.csv,'./data/RTM3_Emp_2015.csv')
              .defer(d3.csv,'./data/Population_2015_RTM3.csv')
              .defer(d3.csv,'./data/DwellingType_2015_RTM3.csv')
              .defer(d3.csv,'./data/DistrictVSZone.csv')
              .await(loadData);

    //after read the data, call loadData.
    function loadData(error,outputData,popEmpData,popBreak,dwellingData,DistrictVSZone){

        //store data into global variables
        tripsDataset = outputData;
        let zoneToDistrictDict = getZoneToDistrict(DistrictVSZone);
        popEmpDataset = convertCSVData(popEmpData,zoneToDistrictDict);
        populationBreakdown = convertCSVData(popBreak,zoneToDistrictDict);
        dwellingTypeDataset = convertCSVData(dwellingData,zoneToDistrictDict);

        let map = new Map("mapDiv", {
            basemap: "gray-vector",
            center: [-113.4909, 53.5444],
            zoom: 8,
            minZoom:6,
        });

        //travel zone layer
        let DistrictLayer = new FeatureLayer("https://services8.arcgis.com/FCQ1UtL7vfUUEwH7/arcgis/rest/services/district1669/FeatureServer/0",{
            mode: FeatureLayer.MODE_SNAPSHOT,
            outFields: ["*"],
            // infoTemplate:new InfoTemplate("Attributes", "Travel Zone:${TAZ_New}")
        });
        //LRT layer
        let lrtFeatureLayer = new FeatureLayer("https://services8.arcgis.com/FCQ1UtL7vfUUEwH7/arcgis/rest/services/LRT/FeatureServer/0",{
            mode: FeatureLayer.MODE_SNAPSHOT,
            outFields: ["*"],
        });
        let hydroLayer = new FeatureLayer("https://services8.arcgis.com/FCQ1UtL7vfUUEwH7/arcgis/rest/services/edmontonHydro/FeatureServer/0",{
            mode: FeatureLayer.MODE_SNAPSHOT,
            outFields: ["*"],
        });
        //when map is loading
        map.on('load',function(){
            map.addLayer(DistrictLayer);
            map.addLayer(lrtFeatureLayer);
            map.addLayer(hydroLayer);
            drawChart(selectedZone);//draw all the charts based on the default zone
        });

        //render color on the travel zone layer
        let symbol = new SimpleFillSymbol();
        let renderer = new ClassBreaksRenderer(symbol, function(feature){
            return 1;
        });
        renderer.addBreak(0, 10, new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,new Color([65,105,225,0.5]),1)).setColor(new Color([255, 255, 255,0.5])));
        DistrictLayer.setRenderer(renderer);
        DistrictLayer.redraw();

        //add onclick event of district layer
        DistrictLayer.on('click',function(e){
            selectedZone = e.graphic.attributes[districtLayerAttributeID];//get selected zone
            // Draw the chart and set the chart values
            drawChart(selectedZone);
            if(selectedDistrictLayer){
                map.removeLayer(selectedDistrictLayer);
            }
            selectedDistrictLayer = new GraphicsLayer({ id: "selectedDistrictLayer" });
            let highlightSymbol = new SimpleFillSymbol(
                SimpleFillSymbol.STYLE_SOLID,
                new SimpleLineSymbol(
                    SimpleLineSymbol.STYLE_SOLID,
                    new Color([255,0,0,0.5]), 2
                ),
                new Color([255,0,0,0.5])
            );
            let graphic = new Graphic(e.graphic.geometry, highlightSymbol);
            selectedDistrictLayer.add(graphic);
            map.addLayer(selectedDistrictLayer);
        });

        //initialize dwelling chart
        let dwellingChart = Highcharts.chart('dwelling', {
                chart: {
                    polar: true,
                    type: 'line'
                },
                title: {
                    text: 'Dwelling Type',

                },
                pane: {
                    size: '80%'
                },
                xAxis: {
                    min: 0,
                    categories: [],
                    tickmarkPlacement: 'on',
                    lineWidth: 0,
                },
                yAxis: {
                    gridLineInterpolation: 'polygon',
                    lineWidth: 0,
                    min: 0,

                },
                tooltip: {
                    shared: true,
                },

                series: [{
                    name: "Number of Dwelling Units",
                    data: [],
                    pointPlacement: 'on',
                    dataLabels: {
                        enabled: true,
                        format: '{point.y}', // one decimal
                        y: 0, // 10 pixels down from the top
                        style: {
                            fontSize: '8px',
                            textOverflow: 'clip'
                        }
                    }
                }],
                credits: {
                    enabled: false
                }
        });
        //initialize autoOwnership chart
        let autoOwnershipChart = Highcharts.chart('autoOwnership', {
            chart: {
                type: 'column'
            },
            title: {
                text: 'Auto Ownership'
            },
            xAxis: {
                categories: '',
                title: {
                    text: "Number of Cars Per Household"
                }
            },
            yAxis: {
                min: 0,
                title: {
                    text: 'Total',
                },
                labels: {
                    overflow: 'justify'
                }
            },
            tooltip: {
                shared: true,
            },
            legend: {
                layout: 'vertical',
                align: 'right',
                verticalAlign: 'top',
                x: -40,
                y: 80,
                floating: true,
                borderWidth: 1,
                backgroundColor: ((Highcharts.theme && Highcharts.theme.legendBackgroundColor) || '#FFFFFF'),
                shadow: true
            },
            credits: {
                enabled: false
            },
            series: [{
                name:'Total',
                type: 'column',
                data:  '',
                showInLegend: false
            }]
        });

        //initialize mode chart
        let modeChart = Highcharts.chart('mode', {
            chart: {
                inverted: false,
                polar: true
            },
            title: {
                text: 'Travel Mode',
            },
            xAxis: {
                categories: []
            },
            series: [{
                name:'Total',
                type: 'column',
                colorByPoint: true,
                data: [],
                showInLegend: false,
                dataLabels: {
                    enabled: true,
                    format: '{point.y}', // one decimal
                    y: 0, // 10 pixels down from the top
                    style: {
                        fontSize: '8px',
                        textOverflow: 'clip'
                    }
                }
            }],
            legend: {
                enabled: true
            },
            credits: {
                enabled: false
            }
        });

        //initialize income chart
        let incomeChart = Highcharts.chart('income', {
            chart: {
                type: 'column'
            },
            title: {
                text: 'Income Group'
            },
            xAxis: {
                type: 'category'
            },
            legend: {
                enabled: false
            },
            plotOptions: {
                column: {
                    pointPadding: 0.2,
                    borderWidth: 0
                },
                series: {
                    borderWidth: 0,
                    dataLabels: {
                        enabled: true,
                        format: '{point.y:.1f}%'
                    }
                }
            },
            tooltip: {

                pointFormat: '<b>{point.y:0.2f}%</b> of total<br/>'
            },
            series: [
                {
                    type: 'column',
                    colorByPoint: true,
                    data: []
                }
            ],
            credits: {
                enabled: false
            }
        });

        //initialize Household chart
        let HHChart = Highcharts.chart('HHSize', {
            chart: {
                plotBackgroundColor: null,
                plotBorderWidth: null,
                plotShadow: false,
                type: 'bar'
            },
            title: {
                text: 'Household Size'
            },
            tooltip: {
                headerFormat: '<span style="font-size:11px">{point.name}</span><br>',
                pointFormat: '<span style="color:{point.color}">Total</span>: <b>{point.y}</b><br/>'
            },
            yAxis: {
                title: {
                    text:'Total'
                }
            },
            legend: {
                enabled: false
            },
            series: [{
                colorByPoint: true,
                data:[]
            }],
            credits: {
                enabled: false
            }
        });
        Highcharts.setOptions({
            lang: {
                drillUpText: 'Back'
            }
        });
        //initialize Trips By Purpose chart
        let tripsByPurposeChart = Highcharts.chart('tripsByPurpose', {
            chart: {
                plotBackgroundColor: null,
                plotBorderWidth: 0,
                plotShadow: false,
                events: {
                    drilldown: function(e) {
                        tripsByPurposeChart.setTitle({ text: e.point.name });
                    },
                    drillup: function(e) {
                        tripsByPurposeChart.setTitle({ text: "Trips By Purpose" });
                    }
                },

            },
            yAxis:{
                text:''
            },
            title: {
                text: 'Trips By Purpose',
                y: 40
            },
            plotOptions: {
                pie: {
                    dataLabels: {
                        enabled: true,
                        style: {
                            fontWeight: 'bold',
                            color: 'white',
                            textOverflow: 'clip'
                        }
                    },
                    startAngle: -90,
                    endAngle: 90,
                    center: ['50%', '75%'],
                    size: '60%',
                }
            },
            series: [{
                type: 'pie',
                name: 'Trips Amount',
                data: [],

            }],
            credits: {
                enabled: false
            },
            drilldown:{
                series: []
            }
        });
        $('#changeMode').on('click',function(e){
            if(professionalTravelModeChart===false){
                professionalTravelModeChart=true;
                updateTravelModeChart(selectedZone);
            }
            else{
                professionalTravelModeChart=false;
                updateTravelModeChart(selectedZone);
            }
        });

        //update charts based on current selected zone
        //This function will be called whenever the user changes his selection.
        function drawChart(selectedZone){
            //automatically click drilldown back button
            $('.highcharts-drillup-button').click();
            //update dwelling chart data
            updateDwellingChart(selectedZone);
            //update travel mode chart
            updateTravelModeChart(selectedZone);
            //update autoOwnerShip chart
            updateAutoOwnershipChart(selectedZone);
            //update income chart data
            updateIncomeChart(selectedZone);
            //update HHSize chart data
            updateHHChart(selectedZone);
            //update trips by purpose chart's data
            updateTripByPurposeChart(selectedZone);
            //update four bullet charts
            updateBulletChart();
        }
        function updateTripByPurposeChart(selectedZone){
            let tripsByPurposeArray = [];
            for(let i in tripsDataset[selectedZone]['TourPurp']){
                tripsByPurposeArray.push({'name':purposeDict[i],'y':tripsDataset[selectedZone]['TourPurp'][i],'drilldown':i})
            }
            tripsByPurposeChart.xAxis[0].setCategories(getCategoriesOfDistByPurp(tripsDataset[selectedZone]['TourDistByPurp']));
            //update drilldown data of trips by purpose chart
            tripsByPurposeChart.options.drilldown.series = generateDrilldownSeries(tripsDataset[selectedZone]['TourDistByPurp']);
            tripsByPurposeChart.series[0].setData(tripsByPurposeArray);
        }
        function updateHHChart(selectedZone){
            let HHSizeArray = [];
            let HHlargerThanFive = 0;
            for(let i in tripsDataset[selectedZone]['HHSize']){
                //combine the value of 5+ condition
                if(Number(i)>=5){
                    HHlargerThanFive+=tripsDataset[selectedZone]['HHSize'][i];
                }
                else{
                    HHSizeArray.push([i,tripsDataset[selectedZone]['HHSize'][i]])
                }
            }
            HHSizeArray.push(['5+',HHlargerThanFive]);//add 5+ data to the autoArray
            HHChart.series[0].setData(HHSizeArray);
            HHChart.xAxis[0].setCategories(getKeysValuesOfTripsObject(HHSizeArray)[0])
            //update trips by purpose chart data
        }
        function updateIncomeChart(selectedZone){
            let incomeSum=0;
            for (let i in tripsDataset[selectedZone]['IncGrp']){
                incomeSum += tripsDataset[selectedZone]['IncGrp'][i];
            }
            let incomeArray = [];
            for(let i in tripsDataset[selectedZone]['IncGrp']){
                incomeArray.push([incomeDict[i],tripsDataset[selectedZone]['IncGrp'][i]*100/incomeSum]);
            }
            incomeChart.series[0].setData(incomeArray);
        }
        function updateAutoOwnershipChart(selectedZone){
            let autoArray= [];
            let largerThanFive = 0;
            if(typeof(tripsDataset[selectedZone])=== 'undefined'){
                alert('There is no trip data of your selected zone!');
                hideCharts();
                return
            }
            showCharts();
            for(let i in tripsDataset[selectedZone]['Own']){
                //combine the value of 5+ condition
                if(i>=5){
                    largerThanFive+=tripsDataset[selectedZone]['Own'][i];
                }
                else{
                    autoArray.push([i,tripsDataset[selectedZone]['Own'][i]]);
                }
            }
            autoArray.push(['5+',largerThanFive]);//add 5+ data to the autoArray
            autoOwnershipChart.series[0].setData(getKeysValuesOfTripsObject(autoArray)[1]);
            autoOwnershipChart.xAxis[0].setCategories(getKeysValuesOfTripsObject(autoArray)[0]);
            updateTravelModeChart(selectedZone);

        }
        function updateDwellingChart(selectedZone){
            dwellingChart.series[0].setData(getKeysValuesOfObject(dwellingTypeDataset[selectedZone])[1]);
            dwellingChart.xAxis[0].setCategories(getKeysValuesOfObject(dwellingTypeDataset[selectedZone])[0]);
            if(dwellingChart.yAxis[0].getExtremes().dataMax === 0){
                dwellingChart.yAxis[0].setExtremes(0,10);
            }
            else{
                dwellingChart.yAxis[0].setExtremes();
            }
        }
        function updateTravelModeChart(selectedZone){
            if(professionalTravelModeChart === false){
                let modeArray= [];
                for(let i in tripsDataset[selectedZone]['Mode']){
                    modeArray.push([i,tripsDataset[selectedZone]['Mode'][i]]);}
                modeChart.series[0].setData(getKeysValuesOfTripsObject(modeArray)[1]);
                modeChart.xAxis[0].setCategories(getKeysValuesOfTripsObject(modeArray)[0]);
            }
            else{
                /**Start of Special Mode Chart*/
                let selfDefinedMode = {'Bike':0,'Driver':0,'Transit':0,'School Bus':0,'Passenger':0,'Walk':0};
                for(let i in tripsDataset[selectedZone]['Mode']){
                    if(i==='Bike'){
                        selfDefinedMode['Bike']+=tripsDataset[selectedZone]['Mode'][i]
                    }
                    else if(i==='SOV'){
                        selfDefinedMode['Driver']+=tripsDataset[selectedZone]['Mode'][i]
                    }
                    else if(i==='WAT'){
                        selfDefinedMode['Transit']+=tripsDataset[selectedZone]['Mode'][i]
                    }
                    else if(i==='PNR'){
                        selfDefinedMode['Transit']+=tripsDataset[selectedZone]['Mode'][i]
                    }
                    else if(i==='SB'){
                        selfDefinedMode['School Bus']+=tripsDataset[selectedZone]['Mode'][i]
                    }
                    else if(i==='HOV2'){
                        selfDefinedMode['Driver']+=tripsDataset[selectedZone]['Mode'][i]/2
                        selfDefinedMode['Passenger']+=tripsDataset[selectedZone]['Mode'][i]/2
                    }
                    else if(i==='HOV3'){
                        selfDefinedMode['Driver']+=tripsDataset[selectedZone]['Mode'][i]/3.2
                        selfDefinedMode['Passenger']+=tripsDataset[selectedZone]['Mode'][i]*2.2/3.2
                    }
                    else if(i==='Walk'){
                        selfDefinedMode['Walk']+=tripsDataset[selectedZone]['Mode'][i]
                    }
                    else if(i==='KNR'){
                        selfDefinedMode['Transit']+=tripsDataset[selectedZone]['Mode'][i]
                    }

                }
                let modeArray= [];
                for(let i in selfDefinedMode){
                    modeArray.push([i,selfDefinedMode[i]]);}
                modeChart.series[0].setData(getKeysValuesOfTripsObject(modeArray)[1]);
                modeChart.xAxis[0].setCategories(getKeysValuesOfTripsObject(modeArray)[0]);
                /**End of Special Mode Chart*/
            }
        }
    }
});

/***
all the bullets chart is able to drill down
However, I didn't use the highchart's drill down function, since it is not very suitable to this case.
I put four bullets chart into a single DIV, and I need each bullet chart being able to change itself to show a detailed bar/pie chart.
I wrote my own drill down method.
***/
function hideCharts(){
    $('.subchart').hide();
}
function showCharts(){
    $('.subchart').show();
}
function updateBulletChart(){
    //set highcharts' feature to draw bullet chart
    Highcharts.setOptions({
        chart: {
            inverted: true,
            marginLeft: 135,
            type: 'bullet'
        },
        title: {
            text: null
        },
        legend: {
            enabled: false
        },
        yAxis: {
            gridLineWidth: 0
        },
        plotOptions: {
            series: {
                borderWidth: 0,
                color: '#000',
            }
        },
        credits: {
            enabled: false
        },
        exporting: {
            enabled: false
        }
    });
    //show all four bullet charts
    $('#avgDist').show();
    $('#avgGHG').show();
    $('#totalEmp').show();
    $('#totalPop').show();
    $('#avgDist').height('25%');
    $('#avgGHG').height('25%');
    $('#totalEmp').height('25%');
    $('#totalPop').height('25%');
    //calculate total distance
    let totalDist = 0;
    for(let k in tripsDataset[selectedZone]['Dist']){
        totalDist += tripsDataset[selectedZone]['Dist'][k]
    }
    //calculate total numbers of trips
    let totalAmount = 0;
    for(let k in tripsDataset[selectedZone]['TourPurp']) {
        totalAmount += tripsDataset[selectedZone]['TourPurp'][k]
    }
    //draw Average Travel Distance bullet chart
    let distChart = Highcharts.chart('avgDist', {
        chart: {
            marginTop: 20
        },
        yAxis: {
            plotBands: [{
                from: 0,
                to: 30,
                color: '#999'
            }, {
                from: 30,
                to: 1000000000,
                color: '#999'
            }],
            labels: {
                format: '{value}'
            },
            title: null
        },
        xAxis: {
            categories: ['Average Travel  <br/>Distance (km)'],
            labels: {
                style: {
                    color: '#212d7a',
                    fontWeight: 'bold',
                    textDecoration:'underline'
                }
            }
        },
        tooltip: {
            pointFormat: '{series.name}: <b>{point.y:.2f}</b>'
        },
        series: [{
            name:'Distance',
            data: [{
                y: totalDist/totalAmount,
                target: 30,
            }]
        }],
    });
    //add click event to the label
    distChart.xAxis[0].labelGroup.element.childNodes.forEach(function(label)
    {
        label.style.cursor = "pointer";
        //when the user clicks on the distChart's labels, the following function will be called.
        label.onclick = function() {
            // show average distance chart and hide all the others
            $('#avgDist').show();
            $('#avgDist').height('100%');
            $('#totalEmp').hide();
            $('#avgGHG').hide();
            $('#totalPop').hide();
            let distByPurpose = [];
            for(let purp in tripsDataset[selectedZone]['TourPurp']){
                distByPurpose.push([purposeDict[purp],tripsDataset[selectedZone]['Dist'][purp]/tripsDataset[selectedZone]['TourPurp'][purp]])
            }
            //update the avgDist chart to a dist by purpose
            let drillDownDistChart = Highcharts.chart('avgDist', {
                chart: {
                    type: 'column'
                },
                title: {
                    text: 'Average Distance By Purpose'
                },
                xAxis: {
                    type: 'category',
                    labels: {
                        rotation: -0,
                        style: {
                            fontSize: '13px',
                            fontFamily: 'Verdana, sans-serif',
                            textOverflow: 'clip'

                        }
                    }
                },
                yAxis: {
                    min: 0,
                    title: {
                        text: ' Travel distance (km)'
                    }
                },
                tooltip: {
                    headerFormat: '<span style="font-size:11px">{point.name}</span><br>',
                    pointFormat: '<span style="color:{point.color}">Total</span>: <b>{point.y:0.2f}</b><br/>'
                },
                legend: {
                    enabled: false
                },
                series: [{
                    type:'column',
                    name: 'Population',
                    data: distByPurpose,
                    dataLabels: {
                        enabled: true,
                        format: '{point.y:.1f}', // one decimal
                        y: 0, // 10 pixels down from the top
                        style: {
                            fontSize: '8px',
                            textOverflow: 'clip'
                        }
                    }
                }]
            });
            //add click label event to the dist by purpose chart
            //if the user clicks on this drillDownDistChart's labels, the updateBulletChart function will be called again.
            //it is a self-perpetuate feature
            $('#avgDist').append("<button class='back' id='backButton'>Back</button>");
            $('#backButton').on('click',function(e){
                $("#backButton").remove();
                updateBulletChart()
            })

        }
    });
    //draw average green house gas emission chart
    let ghgChart = Highcharts.chart('avgGHG', {
        chart: {
            marginTop: 20
        },
        xAxis: {
            categories: ['Average GHG (kg)'],
            labels: {
                style: {
                    color: '#212d7a',
                    fontWeight: 'bold',
                    textDecoration:'underline'
                }
            }
        },
        yAxis: {
            plotBands: [{
                from: 0,
                to: 10,
                color: '#999'
            }, {
                from: 10,
                to: 10000000,
                color: '#999'
            }],
            title: null
        },
        series: [{
            name:'Gas Weight',
            data: [{
                y: totalDist/totalAmount*0.327,
                target: 10,
            }
            ]
        }],
        tooltip: {
            pointFormat: '{series.name}: <b>{point.y:.2f}</b>'
        },
    });
    //draw total employment bullet chart
    let totalEmp = Highcharts.chart('totalEmp', {
        chart: {
            marginTop: 20
        },
        xAxis: {
            categories: ['Total Jobs'],
            labels: {
                style: {
                    color: '#212d7a',
                    fontWeight: 'bold',
                    textDecoration:'underline'
                }
            }
        },
        yAxis: {
            plotBands: [{
                from: 0,
                to: 1000000000000000,
                color: '#999'
            }],
            title: null
        },
        series: [{
            data: [{
                y: Number(popEmpDataset[selectedZone]['Jobs']),
                target: 0,
            }]
        }],
        tooltip: {
            pointFormat: '<b>{point.y}</b> (with target at {point.target})'
        }
    });
    //add drilldown event to the label of the chart
    ghgChart.xAxis[0].labelGroup.element.childNodes.forEach(function(label)
    {
        label.style.cursor = "pointer";
        label.onclick = function() {
            $('#avgGHG').show();
            $('#avgGHG').height('100%');
            $('#avgDist').hide();
            $('#totalEmp').hide();
            $('#totalPop').hide();
            let ghgByPurpose = [];
            for(let purp in tripsDataset[selectedZone]['TourPurp']){
                ghgByPurpose.push([purposeDict[purp],tripsDataset[selectedZone]['Dist'][purp]*0.327/tripsDataset[selectedZone]['Person#'][purp]])
            }
            let drillDownGHGChart = Highcharts.chart('avgGHG', {
                chart: {
                    type: 'column'
                },
                title: {
                    text: 'Average Greenhouse Gas By Purpose'
                },
                xAxis: {
                    type: 'category',
                    labels: {
                        rotation: -0,
                        style: {
                            fontSize: '13px',
                            fontFamily: 'Verdana, sans-serif',
                            textOverflow: 'clip'
                        }
                    }
                },
                yAxis: {
                    min: 0,
                    title: {
                        text: ' GHG emission(kg)'
                    }
                },
                tooltip: {
                    headerFormat: '<span style="font-size:11px">{point.name}</span><br>',
                    pointFormat: '<span style="color:{point.color}">Amount</span>: <b>{point.y:0.2f}</b><br/>'
                },
                legend: {
                    enabled: false
                },
                series: [{
                    data: ghgByPurpose,
                    dataLabels: {
                        enabled: true,
                        format: '{point.y:.1f}', // one decimal
                        y: 0, // 10 pixels down from the top
                        style: {
                            fontSize: '8px',
                            textOverflow: 'clip'
                        }
                    }
                }]
            });
            $('#avgGHG').append("<button class='back' id='backButton'>Back</button>");
            $('#backButton').on('click',function(e){
                $("#backButton").remove();
                updateBulletChart()
            })
        }
    });
    //add drill down event
    totalEmp.xAxis[0].labelGroup.element.childNodes.forEach(function(label)
    {
        label.style.cursor = "pointer";
        label.onclick = function() {
            $('#totalEmp').show();
            $('#totalEmp').height('100%');
            $('#avgDist').hide();
            $('#avgGHG').hide();
            $('#totalPop').hide();
            let ghgByPurpose = [];
            for(let purp in tripsDataset[selectedZone]['TourPurp']){
                ghgByPurpose.push([purposeDict[purp],tripsDataset[selectedZone]['Dist'][purp]*0.327/tripsDataset[selectedZone]['Person#'][purp]])
            }
            let drillDownGHGChart = Highcharts.chart('totalEmp', {
                chart: {
                    type: 'column'
                },
                title: {
                    text: 'I do not know what to draw'
                },
                xAxis: {
                    type: 'category',
                    labels: {
                        rotation: -0,
                        style: {
                            fontSize: '13px',
                            fontFamily: 'Verdana, sans-serif',
                            textOverflow: 'clip'
                        }
                    }
                },
                yAxis: {
                    min: 0,
                    title: {
                        text: ' GHG emission(kg)'
                    }
                },
                tooltip: {
                    headerFormat: '<span style="font-size:11px">{point.name}</span><br>',
                    pointFormat: '<span style="color:{point.color}">Amount</span>: <b>{point.y:0.2f}</b><br/>'
                },
                legend: {
                    enabled: false
                },
                series: [{
                    data: ghgByPurpose,
                    dataLabels: {
                        enabled: true,
                        format: '{point.y:.1f}', // one decimal
                        y: 0, // 10 pixels down from the top
                        style: {
                            fontSize: '8px',
                            textOverflow: 'clip'
                        }
                    }
                }]
            });
            //add back event
            $('#totalEmp').append("<button class='back' id='backButton'>Back</button>");
            $('#backButton').on('click',function(e){
                $("#backButton").remove();
                updateBulletChart()
            })

        }
    });
    //calculate population
    let popOfSelectedZone = 0;
    for(let i in populationBreakdown[selectedZone]){
        popOfSelectedZone+=Number(populationBreakdown[selectedZone][i])
    }
    //draw total population bullet chart
    let totalPop = Highcharts.chart('totalPop', {
        chart: {
            marginTop: 20,
        },
        xAxis: {
            categories: ['Total Population'],
            labels: {
                style: {
                    color: '#212d7a',
                    fontWeight: 'bold',
                    textDecoration:'underline'
                }
            }
        },
        yAxis: {
            plotBands: [ {
                from: 0,
                to: 100000000000000,
                color: '#999'
            }],
            title: null
        },
        series: [{
            data: [{
                y:popOfSelectedZone ,
                target: 0,
            }]
        }],
        tooltip: {
            pointFormat: '<b>{point.y}</b> (with target at {point.target})'
        }
    });
    //add drill down event
    totalPop.xAxis[0].labelGroup.element.childNodes.forEach(function(label)
    {
        label.style.cursor = "pointer";
        label.onclick = function() {
            $('#totalPop').show();
            $('#totalPop').height('100%');
            $('#avgDist').hide();
            $('#avgGHG').hide();
            $('#totalEmp').hide();

            let popDrilldown =Highcharts.chart('totalPop', {
                chart: {
                    marginLeft: 3,
                    type: 'variablepie',
                },
                title: {
                    text: 'Age Distribution'
                },
                tooltip: {
                    headerFormat: '',
                    pointFormat: '<span style="color:{point.color}">\u25CF</span> <b> {point.name}</b><br/>' +
                    'Age: <b>{point.name}</b><br/>' +
                    'Population: <b>{point.z}</b><br/>'
                },
                plotOptions: {
                    variablepie: {
                        size:'60%',
                        allowPointSelect: true,
                        dataLabels: {
                            enabled: true,
                            format: '<b>{point.name}</b>: {point.percentage:.1f} %',
                            style: {
                                color: (Highcharts.theme && Highcharts.theme.contrastTextColor) || 'black'
                            },
                            textOverflow: 'clip'
                        },
                    }
                },
                //Hard coding part. If your data structure change, you will have to change this part of code
                series: [{
                    innerSize: '20%',
                    data: [{
                        name: '0~4',
                        y: Number(populationBreakdown[selectedZone]['age04']),
                        z: 4
                    }, {
                        name: '5~9',
                        y: Number(populationBreakdown[selectedZone]['age59']),
                        z: 9
                    }, {
                        name: '10~14',
                        y:  Number(populationBreakdown[selectedZone]['age1014']),
                        z: 14
                    }, {
                        name: '15~19',
                        y: Number(populationBreakdown[selectedZone]['age1519']),
                        z: 19
                    }, {
                        name: '20~24',
                        y: Number(populationBreakdown[selectedZone]['age2024']),
                        z: 24
                    }, {
                        name: '25~34',
                        y: Number(populationBreakdown[selectedZone]['age2534']),
                        z: 34
                    }, {
                        name: '35~44',
                        y: Number(populationBreakdown[selectedZone]['age3544']),
                       z: 44
                    },
                    {
                        name: '45~54',
                        y: Number(populationBreakdown[selectedZone]['age4554']),
                        z: 54
                    },
                    {
                        name: '55~64',
                        y: Number(populationBreakdown[selectedZone]['age5564']),
                       z:64
                    },
                    {
                        name: '65~74',
                        y: Number(populationBreakdown[selectedZone]['age6574']),
                        z: 74
                    },
                    {   color:'red',
                        name: '75+',
                        y: Number(populationBreakdown[selectedZone]['age75a']),
                        z:84
                    }]
                }]
            });

            $('#totalPop').append("<button class='back' id='backButton'>Back</button>");
            $('#backButton').on('click',function(e){
                $("#backButton").remove();
                updateBulletChart()
            });
        }
    });
}
//seperate a Trip object into a list of values and a list of keys
function getKeysValuesOfTripsObject(obj){
    let keys = [];
    let values = [];
    for(let k in obj){
        keys.push(obj[k][0]);
        values.push(Number(obj[k][1]));
    }
    return [keys,values];
}
//seperate an common object into a list of values and a list of keys
function getKeysValuesOfObject(obj){
    let keys = [];
    let values = [];
    for(let k in obj){
        keys.push(k);
        values.push(Number(obj[k]))
    }
    return [keys,values];
}
//convert csv data into desirable json format
//the DwellilngType_2015_RTM3.csv, Population_2015_RTM3.csv, and RTM3_Emp_2015.csv are all about travel zone
//You should use DistrictVSZone.csv file to convert travel zone level to district level
function convertCSVData(popEmpDataset,zoneToDistrict) {
    let TAZTitle = 'TAZ1669';
    let tmpData = {};
    for(let k in popEmpDataset){
        let result = {};
        for(let title in popEmpDataset[k]){
            if(title!== TAZTitle){
                result[title] = popEmpDataset[k][title]
            }
        }
        let district = zoneToDistrict[popEmpDataset[k][TAZTitle]];
        if(district in tmpData){
            for(let key in result){
                tmpData[district][key] = Number(tmpData[district][key])+ Number(result[key])
            }
        }
        else{

            tmpData[district] = result
        }
    }

    return tmpData
}
//read zone and district information to a dictionary. It will have this format: {'TravelZone':'District'}
function getZoneToDistrict(DistrictVSZonesDataset){
    let zoneTodistrictDict = {};
    for(let k in DistrictVSZonesDataset){
        zoneTodistrictDict[DistrictVSZonesDataset[k]['TAZ_New']] = DistrictVSZonesDataset[k]['District']
    }
    return zoneTodistrictDict;

}
//generate drilldown series of 'Trips by purpose' chart
function generateDrilldownSeries(distPurpArray){
    let result = [];
    for(let k in distPurpArray){
        distArray = [];
        for(let distK in distPurpArray[k]){
            distArray.push({'name':distK,'y':distPurpArray[k][distK]})
        }
        result.push({
            id:k,
            type:'line',
            name: 'Amount of Trips',
            data:distArray
        })
    }
    return result
}
//get xAxis categories
function getCategoriesOfDistByPurp(distPurpArray){
    let result = [];
    for(let k in distPurpArray){
        for(let distK in distPurpArray[k]){
            result.push(distK+'km')
        }
        return result
    }
}
$('#tour').on('click',function(e){
    let intro1 = introJs();
    intro1.setOptions({
        tooltipPosition : 'bottom',
        steps: [

            {
                element: '#mapDiv',
                intro: 'Welcome to the District Dashboard! Please click on a district. If there is no data of that district, please try another district.',
                position: 'top'
            },
            {
                element: '#tripsByPurpose',
                intro: 'Now, you could click on a blue label to observe some details.',
                position: 'top'
            },
            {
                element: '#changeMode',
                intro: 'Travel mode could switch between two set of categories. The data set is the same.',
                position: 'top'
            },

            {
                element: '#avgDist',
                intro: 'Again, try to click on a blue label!',
                position: 'top'
            }
        ]
    });
    intro1.start();
});