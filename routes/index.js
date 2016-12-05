var express = require('express');
var router = express.Router();

/* POST to Add User Service */
router.post('/adduser', function(req, res) {

});

/* GET Userlist page. */
router.get('/userlist', function(req, res) {
	collection.find({},{},function(e,docs){
		res.render('userlist', {
            "userlist" : docs
		});
    });
});


/* GET home page. */
router.get('/', function(req, res, next) {	
	res.render('index');
});

/* GET tambah page. */
router.get('/tambah', function(req, res) {
    res.render('tambah', { title: 'Tambah Infus @Infusion Monitoring' });
});

/* GET login page. */
router.get('/login', function(req, res) {
    res.render('login', { title: 'Login @Infusion Monitoring' });
});

module.exports = router;
