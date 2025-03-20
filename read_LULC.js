var year = 2020;
var url = 'projects/ee-carylee/assets/MP_dataset/Landcover1990_2020/Landcover_'+year;
var image = ee.Image(url);
var mask = image.neq(ee.Number(0));
var maskedImage = image.updateMask(mask);
var visualization = {min: 0,   
    max: 14,   
   palette: ["#ffffff",//0
             "#01791a",//1
             "#99d6a5",//2
             "#4dff9a",//3
             "#16f858",//4 
             "#b8d53c",//5D
             "#98f7ff",//7
             "#0c00ff",//8
             "#cf1cff",//9
             "#ff0000",//10
             "#ffbf65",//11
             "#999900",//12
             "#f3ff00",//13
             "#ffffff",//14
             "#759cb3",//6
             ]
};

Map.addLayer(maskedImage,visualization,year+'');