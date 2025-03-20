var year = 2020;
var area = ee.FeatureCollection('STUDY_AREA_BOUNDS');

var dataset = ee.Image('NASA/NASADEM_HGT/001');
print(dataset)
var elevation = dataset.select('elevation').divide(1000).rename('dem');
var slope = ee.Terrain.slope(dataset.select('elevation')).rename('slope');

var dataset = ee.ImageCollection('NOAA/VIIRS/DNB/ANNUAL_V21')
                  .filter(ee.Filter.date(year+'-01-01', year+1+'-01-01'));
var nighttime = dataset.select('median').max().divide(50).rename('light');


function applyScaleFactors5(image) {
    var opticalBands = image.select(['SR_B1','SR_B2','SR_B3','SR_B4','SR_B5','SR_B7']).multiply(0.0000275).add(-0.2);
    var ndvi = ee.Image(0).expression('(b1-b2)/(b1+b2)',{'b1':opticalBands.select('SR_B4'), 'b2':opticalBands.select('SR_B3')}).rename('NDVI'); 
    var ndwi = ee.Image(0).expression('(b1-b2)/(b1+b2)',{'b1':opticalBands.select('SR_B2'), 'b2':opticalBands.select('SR_B4')}).rename('NDWI'); 
    var ndbi = ee.Image(0).expression('(b1-b2)/(b1+b2)',{'b1':opticalBands.select('SR_B5'), 'b2':opticalBands.select('SR_B4')}).rename('NDBI'); 
    return opticalBands.addBands(ndvi,null,true)
      .addBands(ndwi, null, true).addBands(ndbi, null, true)
      .addBands(image.select('QA_PIXEL'), null, true);
  }
function applyScaleFactors8(image) {
    var opticalBands = image.select(['SR_B1','SR_B2','SR_B3','SR_B4','SR_B5','SR_B6','SR_B7']).multiply(0.0000275).add(-0.2);
    var ndvi = ee.Image(0).expression('(b1-b2)/(b1+b2)',{'b1':opticalBands.select('SR_B5'), 'b2':opticalBands.select('SR_B4')}).rename('NDVI'); 
    var ndwi = ee.Image(0).expression('(b1-b2)/(b1+b2)',{'b1':opticalBands.select('SR_B3'), 'b2':opticalBands.select('SR_B5')}).rename('NDWI'); 
    var ndbi = ee.Image(0).expression('(b1-b2)/(b1+b2)',{'b1':opticalBands.select('SR_B6'), 'b2':opticalBands.select('SR_B5')}).rename('NDBI'); 
    var mndwi = ee.Image(0).expression('(b1-b2)/(b1+b2)',{'b1':opticalBands.select('SR_B3'), 'b2':opticalBands.select('SR_B6')}).rename('MNDWI');
    var endisi = ee.Image(0).expression('(b1+b2/2-(b3+b4+b5)/3)/(b1+b2/2+(b3+b4+b5)/3)',{'b1':opticalBands.select('SR_B2'), 'b2':opticalBands.select('SR_B6')}).rename('MNDWI');
    return opticalBands.addBands(ndvi,null,true)
      .addBands(ndwi, null, true).addBands(ndbi, null, true).addBands(mndwi, null, true)
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


function maskL8sr(image) {
  var DilatedCloudBitMask = 1 << 1;
  var cirrusBitMask = 1 << 2;
  var cloudBitMask = 1 << 3;
  var cloudshadowMask = 1<<4;
  var SowBitMask = 1 << 5;
  var qa = image.select('QA_PIXEL');
  var mask = qa.bitwiseAnd(DilatedCloudBitMask).eq(0)
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0))
      .and(qa.bitwiseAnd(cloudBitMask).eq(0))
      .and(qa.bitwiseAnd(cloudshadowMask).eq(0))
      .and(qa.bitwiseAnd(SowBitMask).eq(0));
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


var visualization = {
  bands: vis_bands,
  min: 0.0,
  max: 0.3,
};
var re = ee.ImageCollection([landsat8,baseImage.updateMask(mask)]).mean().clip(area).addBands(elevation.clip(area)).addBands(slope.clip(area)).addBands(nighttime.clip(area));
re = re.addBands(ee.Image('JRC/GHSL/P2023A/GHS_BUILT_V/2020').select('built_volume_total').resample('bicubic').reproject({crs:'epsg:4326',scale:30}).float())
function relabel(pointsLink){
  var label = ee.FeatureCollection(pointsLink)
  function set_new_label(feature){
    return feature.set('first_label',label_value)
  }
  
  var orginal_label = [1,2,3,4,5,6,7,8,9,10,11,12,13];
  var label_values = [1,10,3,3,3,3,7,8,9,10,10,10,13];
  var new_labels = ee.FeatureCollection([])
  for(var i in orginal_label){
    var label_value = label_values[i];
    new_labels = new_labels.merge(label.filter(ee.Filter.eq('label',orginal_label[i])).map(set_new_label));
  }
  return ee.FeatureCollection(new_labels);
}


function randomPoints(pointsLink){
  var training_samples = relabel(pointsLink)
  var training = training_samples.randomColumn("random",1);
  var samples = training.filter(ee.Filter.lt('random',0.9));
  return samples
}
var pointsLink = 'POINTS_LINK'

var labels = randomPoints(pointsLink);

var img_RFs = []


var classifier = ee.Classifier.smileRandomForest(100)
      .train({
        features:labels,
        classProperty:'label', 
        inputProperties:re.select(['SR_B.*','NDVI','NDWI','NDBI','dem','slope','built_volume_total']).bandNames()});
var img_RF = re.classify(classifier);
//Map.addLayer(area.geometry().coveringGrid('EPSG:4326', scale),'')
Map.addLayer(img_RF,visualization,'img_RFs')