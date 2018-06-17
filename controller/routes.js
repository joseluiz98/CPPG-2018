var path = require('path');
var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var env = process.env.NODE_ENV || 'development';
var config = require('../model/config')[env];
var con = mysql.createConnection({
	host: config.database.host,
	user: config.database.user,
	password: config.database.pass,
	database: config.database.db,
	multipleStatements: true
  });

router.get('/', function(req, res, next) {
	res.render(path.resolve(__dirname + '/../views/index.ejs'));
});

router.post('/search', function(req, res, next) {
	searchValue = req.body.searchValue;

	try
	{
		if(con.state === 'disconnected')
		{
			con.connect(function(err) {
				if (err) throw err;
			});
		}
		
		searchValue = '%' + searchValue + '%'; // Apenas escapa as aspas simples
		sql = "SELECT URN_ArtigoCompleto AS proceedingPath FROM publicacao WHERE nomePublicacao LIKE ?";
		
		executeQuery(sql, searchValue).then(function(rows) {
			console.log(rows);
		}).catch((err) => setImmediate(() => { throw err; }));

		res.render(path.resolve(__dirname + '/../views/searchProceedings.ejs'), { searchValue: req.body.searchValue }, function(err, html) {
			if(err) {
				req.session.error = err.message;
				res.redirect('/404');
			} else {
				res.send(html);
			}
		});
	}
	catch(e)
	{
		res.render(path.resolve(__dirname + '/../views/searchProceedings.ejs'), { searchValue: req.body.searchValue }, function(html) {
			req.session.error = e.message;
			res.redirect('/404');
		});
		throw e;
	}

	function executeQuery(query, searchValue)
	{
		return new Promise(function(resolve, reject) {
			con.query(query, searchValue, function (err, result, fields) {
				if (err) {
					return reject(err);
				}
				resolve(result);
			});
		});
	}
});

router.get('/404', function(req, res, next) {
	if(req.session == undefined) res.render(path.resolve(__dirname + '/../views/404.ejs'), {});
	else res.render(path.resolve(__dirname + '/../views/404.ejs'), {
		error: req.session.error
	});
	delete req.session.error;
});

router.get('/publicacoes/:nomePub', function (req, res) {
	req.params.nomePub = '/../public/publicacoes-discentes/2014/Conferencias/Nacional/Resumo/01_CNMAC2014_Welton.pdf';

	res.sendFile(path.resolve(__dirname + req.params.nomePub), function(err, html) {
		if(err) {
			req.session.error = err.message;
			res.redirect('/404');
		} else {
			if(!res.status(200))
			{
				res.send(html);
			}
		}
	});
});

router.get('/pub-discentes/compilados/2014-2016.pdf', function(req, res, next) {
	res.sendFile(path.resolve(__dirname + '/../public/publicacoes-discentes/compilados/2014-2016.pdf'), function(err, html) {
		if(err) {
			req.session.error = err.message;
			res.redirect('/404');
		} else {
			if(!res.status(200))
			{
				res.send(html);
			}
		}
	});
});

router.get('/stackedBar', function(req, res, next) {
	var sql;
	var years;

	try {
		if(con.state === 'disconnected'){
			con.connect(function(err) {
				if (err) throw err;
			});
		}
		
		// Recupera os três últimos anos nos quais hajam dados no banco
		sql = "SELECT anoEdital FROM aluno_participa_projeto AP JOIN projeto P ON P.idProjeto = AP.idProjeto GROUP BY P.anoEdital ORDER BY P.anoEdital DESC";

		con.query(sql, function (er, result, fields)
		{
		if (er) throw er;
		else
		{
			years = result;
			var numberOfYears = 0;
			var conta=[];
			var typesOfAssistance = [];

			for(var i=0; i<years.length; i++)
			{
				lookForProjectsPerYear(years[i].anoEdital, numberOfYears, typesOfAssistance).then(function(typesDown) {
					conta.push(1);

					// Se já rodei todas as promises, mando pra view
					if(conta.length == years.length)
					{
						sendToView(years, typesOfAssistance);
					}
				}).catch((err) => setImmediate(() => { throw err; }));
				numberOfYears++;
			}
		}
		});
	}
	catch(e) {
		throw e;
	}

	function lookForProjectsPerYear(actualYear, countYears, typesOfAssistance)
		{
			var sql = "SELECT AP.modalidadeBolsa AS tipoBolsa FROM aluno_participa_projeto AP JOIN projeto P ON P.idProjeto = AP.idProjeto WHERE P.anoEdital = ?";

			typesOfAssistance[countYears] = [0, 0, 0, 0, 0];
			
			return new Promise(function(resolve,reject)
			{
				con.query(sql, [actualYear], function (er, result, fields)
				{
					if(er) return reject(er);
					for(var j = 0; j<result.length; j++)
					{
						if(result[j].tipoBolsa == "PIBIC")
						{
							typesOfAssistance[countYears][0]++;
						}
						else if(result[j].tipoBolsa == "PIBIC-JR")
						{
							typesOfAssistance[countYears][1]++;
						}
						else if(result[j].tipoBolsa == "PIBIT")
						{
							typesOfAssistance[countYears][2]++;
						}
						else if(result[j].tipoBolsa == "PIBEX")
						{
							typesOfAssistance[countYears][3]++;
						}
						else
						{
							typesOfAssistance[countYears][4]++;
						}
					}
					resolve(typesOfAssistance);
				});
			});
		}

		function getCol(matrix, col)
		{
			var column = [];
			for(var i=0; i<matrix.length; i++){
			   column.push(matrix[i][col]);
			}
			return column;
		 }

		function sendToView(years, typesOfAssistance)
		{
			var pibicAssistance 	= getCol(typesOfAssistance, 0);
			var pibicJrAssistance 	= getCol(typesOfAssistance, 1);
			var pibitAssistance 	= getCol(typesOfAssistance, 2);
			var pibexAssistance 	= getCol(typesOfAssistance, 3);
			var volunteerAssistance = getCol(typesOfAssistance, 4);

			var yearData = [];
			for(var i=(years.length-1); i>=0; i--)
			{
				yearData.push(years[i].anoEdital);
			}

			res.render(path.resolve(__dirname + '/../views/stackedBar.ejs'), {
				years: yearData,
				pibicAssistance: pibicAssistance,
				pibicJrAssistance: pibicJrAssistance,
				pibitAssistance: pibitAssistance,
				pibexAssistance: pibexAssistance,
				volunteerAssistance: volunteerAssistance
			}, function(err, html) {
				if(err) {
					req.session.error = err.message;
					res.redirect('/404');
				} else {
					res.send(html);
				}
			});
		}
});
module.exports = router;