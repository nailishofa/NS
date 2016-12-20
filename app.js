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
	mongodbURI	= 'mongodb://127.0.0.1:27017/TA_2',
	collection;
//MQTT
var mqtt_port = 1883,
	mqtt_host = 'localhost';
//	mqtt_host = 'test.mosquitto.org';

//Socket Connection
var connections,
	io = io(server);	

mongodbClient.connect(mongodbURI, function(err, db) {
	if (err){
		throw err;
	}else{
		console.log("connect MongoD success");
	}
	io.on('connection',function(socket){
		connections = socket;
		var idESP = "ESP1";
		readAll(db, function() { });
		readSensor(idESP, db, function() { });
		connections.on('tambah',function(data){
			var velocity = data.volume*20/data.durasi*60;
			createSensor(data.idESP, data.jenisInfus, velocity, data.volume, db, function() { });
		});
	});
	app.use(function(req, res, next){
	  res.io = io;
	  next();
	});
	
	var client = mqtt.connect({'host': mqtt_host, 'port': mqtt_port});
	client.on('connect', () => { client.subscribe('nailishofa/#',{'qos':2}); });
	client.on('message', (topic, message) => {
		var message	= message.toString('utf-8');
		var value	= topic.split("/");
		var idESP	= value[1];
		var topic 	= value[2];
		console.log('received message %s , %s', topic, message);
		switch(topic){
			case "velocity": db.collection('TA').update(
				{	topic: idESP },
				{ 	$push: {
					"velocity":message,
					"time_velocity":getDateTime(),
				}}, function(err, result) {
					assert.equal(err, null);
				});
			connections.emit('velocity',{'idESP':idESP, 'message':Number(message)});
			break;
			case "volume": 
				var cursor = db.collection('TA').find({'topic':idESP});
				cursor.each(function(err, doc) {
					if (doc != null) {
						var volume			= doc.volume;
						console.log(volume[volume.length-1]);
						volume 				= volume[volume.length-1]-0.5;
						connections.emit('volume',{'idESP':idESP, 'message':volume});
						db.collection('TA').update(
						{	topic: idESP },
						{ 	$push: {
							"volume":volume,
							"time_volume":getDateTime(),
							}}, function(err, result) {
								assert.equal(err, null);
						});
					}
				});
			break;
		}
	});
});

var createSensor = function(idESP, jenisInfus, velocity, volume, db, callback) {
   db.collection('TA').insert({
	   "topic": idESP,
	   "jenisInfus": jenisInfus,
	   "velocity": [velocity],
	   "time_velocity": [getDateTime()],
	   "volume": [volume],
	   "time_volume": [getDateTime()],
	}, function(err, result) {
		callback();
	});
	console.log("create");
};
var readSensor = function(idESP, db, callback) {
	var cursor = db.collection('TA').find({'topic':idESP});
	cursor.each(function(err, doc) {
		if (doc != null) {
			var velocity		= doc.velocity;
			var time_velocity	= doc.time_velocity;
			var volume			= doc.volume;
			var time_volume		= doc.time_volume;
			connections.emit('inisialisasi',{'velocity':velocity,'time_velocity':time_velocity,'volume':volume,'time_volume':time_volume});
		} else {
			callback();
		}
	});
};
var readAll = function(db, callback) {
	var cursor = db.collection('TA').find();
	var i = 0;
	var idESP = [];
	cursor.each(function(err,doc){
		if (doc != null) {
			idESP[i]	= doc.topic;
			i++;
			connections.emit('infus',{'idESP':idESP});
		} else {
			callback();
		}
	});
};

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