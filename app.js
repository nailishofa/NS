var express		= require('express'),
	path 		= require('path'),
	favicon 	= require('serve-favicon'),
	logger 		= require('morgan'),
	cookieParser= require('cookie-parser'),
	bodyParser 	= require('body-parser'),
	io			= require('socket.io'),
	http		= require('http'),
	mongodb		= require('mongodb'),
	assert		= require('assert'),
	mqtt		= require('mqtt');
var routes 	= require('./routes/index'),
	users 	= require('./routes/users');
var app 	= express(),
	server	= http.Server(app);

//DB
var mongodbClient = mongodb.MongoClient,  
	mongodbURI	= 'mongodb://localhost:27017/TA_2',
	collection;
//MQTT
var mqtt_port = 1883,
	mqtt_host = 'localhost';
	//mqtt_host = 'test.mosquitto.org';

//Socket Connection
var connections,
	io = io(server);
	
mongodbClient.connect(mongodbURI, function(err, db) {
//Server io
io.on('connection',function(socket){
	connections = socket;
		readSensor(db, function() { });
});

app.use(function(req, res, next){
  res.io = io;
  next();
});

var client = mqtt.connect({'host': mqtt_host, 'port': mqtt_port});
client.on('connect', () => {
	client.subscribe('#',{'qos':2});
});

//	createSensor(db, function() { });
	client.on('message', (topic, message) => {
		var message	= message.toString('utf-8');
		var value	= topic.split("/");
		var idESP	= value[0];
		var topic 	= value[1];
		console.log('received message %s , %s', topic, message);
		connections.emit('mqtt',{'topic':topic, 'message':Number(message)});
		switch(topic){
			case "voltage":
				db.collection('TA').update(
				{	topic: "ESP1" },
				{ 	$push: {
					"voltage":message,
					"time_voltage":getDateTime(),
				}}, function(err, result) {
					assert.equal(err, null);
				});
			break;
			case "velocity":
				db.collection('TA').update(
				{	topic: "ESP1" },
				{ 	$push: {
					"velocity":message,
					"time_velocity":getDateTime(),
				}}, function(err, result) {
					assert.equal(err, null);
				});
			break;
			case "volume":
				db.collection('TA').update(
				{	topic: "ESP1" },
				{ 	$push: {
					"volume":message,
					"time_volume":getDateTime(),
				}}, function(err, result) {
					assert.equal(err, null);
				});
			break;
		}
	});
});

var getDateTime = function(){
	var date= new Date(),
		hour= date.getHours(),
		min	= date.getMinutes(),
		sec	= date.getSeconds(),
		year= date.getFullYear(),
		month=date.getMonth() + 1,
		day	= date.getDate();
	hour= (hour < 10 ? "0" : "") + hour;
	min = (min < 10 ? "0" : "") + min;
	sec	= (sec < 10 ? "0" : "") + sec;
	month=(month < 10 ? "0" : "") + month;
	day = (day < 10 ? "0" : "") + day;
	return year + "/" + month + "/" + day + " " + hour + ":" + min + ":" + sec + ":";
};

var createSensor = function(db, callback) {
   db.collection('TA').insert({
	   _id: 05,
	   "idPerawat": 00001,
	   "idPasien": 00001,
	   "topic": "ESP1",
	   "voltage": [0],
	   "time_voltage": [getDateTime()],
	   "velocity": [0],
	   "time_velocity": [getDateTime()],
	   "volume": [0],
	   "time_volume": [getDateTime()],
	}, function(err, result) {
		assert.equal(err, null);
		callback();
	});
};
var readSensor = function(db, callback) {
var cursor = db.collection('TA').find({_id:5});
	cursor.each(function(err, doc) {
		assert.equal(err, null);
		if (doc != null) {
//			console.log(doc);
			var voltage 		= doc.voltage;
			var time_voltage	= doc.time_voltage;
			var velocity		= doc.velocity;
			var time_velocity	= doc.time_velocity;
			var volume			= doc.volume;
			var time_volume		= doc.time_volume;
			console.log("io connected");
			connections.emit('inisialisasi',{'voltage':voltage,'time_voltage':time_voltage,'velocity':velocity,'time_velocity':time_velocity,'volume':volume,'time_volume':time_volume});
		} else {
			callback();
		}
	});
};

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', routes);
app.use('/tambah', routes);
app.use('/login', routes);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers
// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

module.exports = {app:app, server:server};