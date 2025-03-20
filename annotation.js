var year = 2020;
var study_area = "innerMongolia";//"innerMongolia" or "mongolia";
var outputName = year+'_innerMongolia_LiKai';
function applyScaleFactors5(image) {
    var opticalBands = image.select(['SR_B1','SR_B2','SR_B3','SR_B4']).multiply(0.0000275).add(-0.2);
    var ndvi = opticalBands.normalizedDifference(['SR_B4', 'SR_B3']).rename('NDVI'); 
    var ndwi = opticalBands.normalizedDifference(['SR_B2', 'SR_B4']).rename('NDWI'); 
    return opticalBands.addBands(ndvi,null,true)
      .addBands(ndwi, null, true)
      .addBands(image.select('QA_PIXEL'), null, true);
  }
function applyScaleFactors8(image) {
    var opticalBands = image.select(['SR_B1','SR_B2','SR_B3','SR_B4','SR_B5']).multiply(0.0000275).add(-0.2);
    var ndvi = opticalBands.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI'); 
    var ndwi = opticalBands.normalizedDifference(['SR_B3', 'SR_B5']).rename('NDWI'); 
    return opticalBands.addBands(ndvi,null,true)
      .addBands(ndwi, null, true)
      .addBands(image.select('QA_PIXEL'), null, true);
  }

if(year <= 2010){
  var link = 'LANDSAT/LT05/C02/T1_L2';
  var applyScaleFactors = applyScaleFactors5;
  var vis_bands = ['SR_B3', 'SR_B2', 'SR_B1'];
  var false_bands = ['SR_B4','SR_B3', 'SR_B2'];
}
else{
  var link = 'LANDSAT/LC08/C02/T1_L2';
  var applyScaleFactors = applyScaleFactors8;
  var vis_bands = ['SR_B4', 'SR_B3', 'SR_B2'];
  var false_bands = ['SR_B5','SR_B4', 'SR_B3'];
}
if(study_area == "mongolia"){
  var area = ee.FeatureCollection('STUDY_AREA_BOUNDS');
  var subArea = ee.FeatureCollection('GRID_polylines')
}
else if(study_area == "innerMongolia"){
  var area = ee.FeatureCollection('STUDY_AREA_BOUNDS');
  var subArea = ee.FeatureCollection('GRID_polylines')
}
function maskL8sr(image) {
  // 包括云周边、卷云、云、云阴影和雪，在产品介绍中有说明，可以根据具体的产品改写
  var DilatedCloudBitMask = 1 << 1;
  var cirrusBitMask = 1 << 2;
  var cloudBitMask = 1 << 3;
  var cloudshadowMask = 1<<4;
  var SowBitMask = 1 << 5;
  
  // 获取pixel QA band，这里需要注意，有些产品是‘piexl_qa’
  var qa = image.select('QA_PIXEL');
  // 明确条件，设置两个值都为0
  var mask = qa.bitwiseAnd(DilatedCloudBitMask).eq(0)
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0))
      .and(qa.bitwiseAnd(cloudBitMask).eq(0))
      .and(qa.bitwiseAnd(cloudshadowMask).eq(0))
      .and(qa.bitwiseAnd(SowBitMask).eq(0));
 
  // 更新掩膜云的波段，最后按照反射率缩放，在选择波段属性，最后赋值给影像
   return image.updateMask(mask).copyProperties(image,["system:time_start"]);
}
var landsat8 = ee.ImageCollection(link)
    .filterBounds(area)
    .filterDate(year+'-06-01', year+'-08-31')
    .map(applyScaleFactors).map(maskL8sr)
    .mean();
var st_year = year-1;
var ed_year = year+1;
var baseImage = ee.ImageCollection(link)
    .filterBounds(area)
    .filterDate(st_year+'-06-01', ed_year+'-08-31').filter(ee.Filter.calendarRange(6,8,'month'))
    .map(applyScaleFactors).map(maskL8sr)
    .mean();
var mask = landsat8.select('SR_B2').unmask(200).eq(200);
var sand_land = ee.Image('OpenLandMap/SOL/SOL_SAND-WFRACTION_USDA-3A1A1A_M/v02');
var visualization = {
  bands: ['b0'],
  min: 1.0,
  max: 100.0,
  palette: [
    'ffff00', 'f8f806', 'f1f10c', 'ebeb13', 'e4e419', 'dddd20',
    'd7d726', 'd0d02d', 'caca33', 'c3c33a', 'bcbc41', 'b6b647',
    'b0b04e', 'a9a954', 'a3a35a', '9c9c61', '959568', '8f8f6e',
    '898975', '82827b', '7b7b82', '757589', '6e6e8f', '686895',
    '61619c', '5a5aa3', '5454a9', '4d4db0', '4747b6', '4141bc',
    '3a3ac3', '3333ca', '2d2dd0', '2626d7', '2020dd', '1919e4',
    '1212eb', '0c0cf1', '0606f8', '0000ff',
  ]
};
Map.addLayer(sand_land.clip(area), visualization, 'Sand content in % (kg / kg)');
var dataset = ee.ImageCollection('ESA/WorldCover/v200').first();
var visualization = {
  bands: ['Map'],
};
var wetLand = ee.FeatureCollection('projects/ee-carylee/assets/wetlands_world')

Map.addLayer(dataset.clip(area), visualization, 'Landcover');

var visualization = {
  bands: vis_bands,
  min: 0.0,
  max: 0.3,
};
var false_visualization = {
  bands: false_bands,
  min: 0.0,
  max: 0.3,
};
var re = ee.ImageCollection([landsat8,baseImage.updateMask(mask)]).mosaic().clip(area);
Map.addLayer(re.select('NDVI'),{min:0,max:0.5},'NDVI');
Map.addLayer(re.select('NDWI'),{min:0,max:0.3},'NDWI');
Map.addLayer(ee.Image("NASA/NASADEM_HGT/001").select('elevation').clip(area),{min:500,max:2000},'DEM')
Map.addLayer(re,false_visualization,'false_color');
Map.addLayer(re,visualization,'Landsat_Image');
Map.addLayer(subArea,{color:'red'},'polygon');
Map.addLayer(wetLand,{color:'red'},'wetLand')