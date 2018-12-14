# District Dashboard
This is a Nodejs web application using Arcgis Javascript API. It displays a dynamic dashboard. When the user clicks on a district zone, the charts will change correspondingly. Highcharts.js is used to draw various kinds of charts.
This application is almost the same as the Travel Zone Dashboard. They use the same dataset and the same UI. But the District Dashboard does a post-process to convert data from travel zone level to district level.
## Set Up:
#### From Github:
1. If you haven't downloaded Nodejs on your computer, you need to download it and add it into PATH.
2. Download this folder
3. Browse to the root of the folder
4. Open the terminal/cmd and go to the root of the App './travelzoneDashboard'. 
5. Type 'npm install'
6. Type 'npm intall express --save'
7. Type 'npm install http-errors --save'
8. Type 'npm install fs --save'
9. Put your csv data into './public/data' folder. 
#### From Lab Computer I
1. Everything has already been set up on this computer.
2. Open the terminal/cmd and go to the root of the App './travelzoneDashboard'. 
3. Put your csv data into './public/data' folder. The input files are 'DwellingType_2015_RTM3.csv', 'Population_2015_RTM3.csv', and 'trips_1.csv'. 
4. If you want to change the data sources, you should follow the names of the files and keep the headers of each file.
## Run
1. Use terminal/cmd to go to the root of the App './travelzoneDashboard'. 
2. Type 'npm start'
3. On the terminal, it will ask 'Have you changed your dataset? y/n'. If you have just updated 'trips_1.csv', you should input 'y'. Then the App will run about 5 minutes to create 'output.json'. After 5 minutes, you should be able to browse 'http://localhost:3043'. If you try to browse 'http://localhost:3043' without waiting for data generation, you may be blocked. If you haven't updated the dataset, you should input 'n' when the terminal asks 'Have you changed your dataset? y/n'. Without updating the dataset, you could browse 'http://localhost:3043' directly without waiting.

## Tips:
#### If you have just updated the './public/data/trips_1.csv' file:
1. You should terminate the web server and rerun 'npm start'.
2. The terminal/cmd will ask you whether you have changed the dataset, and you should input 'y'.
3. You should wait at least 5 minutes to let the application generate output data and then browse 'http://localhost:3043'
#### If you have only updated the other csv files, but not 'trips_1.csv' file:
You don't need to restart the server. You could use 'Ctrl+F5' to refresh your webpage.
#### What is the use of './public/outputData' folder:
The './public/outputData' folder is used to store 'output.json' which is generated by the App based on 'trips_1.csv'.
#### After you change the dataset:
1. After you change the dataset in './public/data' folder, you should go to the terminal, terminate it if it is running, and rerun it by typing 'npm start'. Then follow the third step in 'Run' section.
#### If you want to update the TravelZoneLayer shape file:
 1. The map layer is not stored in localhost. It is stored in the arcgis online server.
 2. In './public/javascript/main.js', you can find the current travel zone layer: 'https://services8.arcgis.com/FCQ1UtL7vfUUEwH7/arcgis/rest/services/newestTAZ/FeatureServer/0'. If you want to change it to another layer, you can create you own arcgis online account and upload the layer to the arcgis server. You need to replace the url into a new one. You can also ask Sandeep to access Yue Ma's arcgis account.
#### Woops, the App can't run after changing a new dataset:
 1. You need to restart the server from terminal/cmd (Rerun 'npm start').
