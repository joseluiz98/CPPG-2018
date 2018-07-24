var vars = require('./variables.js');

var functions = {
    /*
		Function to capitalize the first letter of each string
		params: string to treat, maybe an author full name, etc
		return: string with firts letters of each word capitalized
	*/
	toTitleCase: function (str) {
		return str.replace(/\w\S*/g, function(txt){
			return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
		});
	},
    /* Function to get info of a proceeding by it's code
	   params: code of proceeding to be searched
	   return: array containing proceeding code, it's name and authors
	*/
	getProceedingInfo: function (proceedingCode)
	{
		const getProceedingInfo = "SELECT S.nomeServidor AS proceedingAuthor, P.nomePublicacao AS proceedingName, URN_ArtigoCompleto AS proceedingPath FROM servidor S JOIN servidor_publica SP ON S.siapeServidor = SP.siapeServidor JOIN publicacao P ON P.codPublicacao = SP.codPublicacao WHERE P.codPublicacao = " + proceedingCode + "";
		const getProceedingStudents = "SELECT nomeAluno AS proceedingStudent FROM aluno_publica AP JOIN aluno A ON AP.matriculaAluno = A.matriculaAluno JOIN publicacao P ON P.codPublicacao = AP.codPublicacao WHERE P.codPublicacao = " + proceedingCode + "";
		const sql = getProceedingInfo +";"+ getProceedingStudents +";";
		
		return new Promise(function(resolve, reject)
		{
			vars.con.query(sql, [1, 2], function (err, results, fields)
			{
				var proceedingInfo = [];
				proceedingInfo.push(proceedingCode);
				proceedingInfo.push(results[0][0]["proceedingName"]);
				proceedingInfo.push([]);
				
				if(results[0]["proceedingPath"] != null) proceedingInfo.push(results[0]["proceedingPath"]);
				else proceedingInfo.push('null');
				results[0].forEach(function(result)
				{
					var proceedingAuthor = functions.toTitleCase(result["proceedingAuthor"]);
					proceedingInfo[2].push(proceedingAuthor);
				});

				// Itera entre os alunos envolvidos
				proceedingInfo.push([]);
				results[1].forEach(function(student)
				{
					proceedingInfo[4].push(student["proceedingStudent"]);
				});
				resolve(proceedingInfo);
			});
        });
    },
    /* This function gets proceeding code, by one of it's keywords known
        params: Proceeding keyword (string)
        return: Proceeding code (int) 
    */
   getProceedingCodeByKeyword(keywordToBeSearched)
   {
        const sql = "SELECT P.codPublicacao AS code FROM palavras_chave_publicacao PCP JOIN publicacao P ON P.codPublicacao = PCP.fk_codPublicacao WHERE PCP.palavra = '" + keywordToBeSearched + "'";
       
        return new Promise(function(resolve, reject)
        {
			vars.con.query(sql, function (err, results, fields)
			{
                if(err) return reject(err);
                else 
                {
                    var proceedingsCodes = [];
                    results.forEach(function(proceedingCode)
                    {
                        proceedingsCodes.push(proceedingCode["code"]);
                    });
                    resolve(proceedingsCodes);
                }
			});
        });
   }
};
  module.exports = functions;