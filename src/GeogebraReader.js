JXG.GeogebraReader = new function() {

/**
 * Identifying non-associative tokens
 * @param {String} type the type of the non-associative token 
 * @param {String} att the value of the token 
 * @return {Function} return the function that returns the correct value 
 */
this.ggbMatch = function(type, att) {
  switch(type.toLowerCase()) {
    case 'int':
      return function() { return parseInt(att); };
    break;
    case 'float':
      return function() { return parseFloat(att); };
    break;
    case 'html':
      return function() { return String(att); };
    break;
    case 'var':
      JXG.GeogebraReader.debug("VAR: "+ att);
      switch(att.toLowerCase()) {
        case 'x':
          return function(v) { return v.X(); };
        break;
        case 'y':
          return function(v) { return v.Y(); };
        break;
        case 'sin':
          return function(v) { return Math.sin(v); };
        break;
        default:
          if(typeof JXG.GeogebraReader.board.ggbElements[att] == 'undefined' || JXG.GeogebraReader.board.ggbElements[att] == '') {
            var input = JXG.GeogebraReader.getElement(att);
            JXG.GeogebraReader.board.ggbElements[att] = JXG.GeogebraReader.writeElement(board, input);
            JXG.GeogebraReader.debug("regged: "+ att +" (id: "+ JXG.GeogebraReader.board.ggbElements[att].id +")");
          }
          return JXG.GeogebraReader.board.ggbElements[att];
        break;
      }
    break;
    case 'string':
      return function() { return String(att); };
    break;
    case 'func':
      JXG.GeogebraReader.debug('In FUNC(Match): '+ att);
      var r = JXG.GeogebraReader.functionParse(att)
      return r[r.length-1];
    break;
    // case 'param':
    //   return att;
    // break;
  }
};

/**
 * @param {String} type the type of expression
 * @param {String} m first input value
 * @param {String} n second input value
 * @param {Object} p point or object to update 
 * @return {String} return the object, string or calculated value
 */
this.ggbAct = function(type, m, n, p) {
JXG.GeogebraReader.debug('* '+ type);
  var v1 = m, v2 = n;
  switch(type.toLowerCase()) {
    case 'error':
      JXG.GeogebraReader.debug("<b style='color:red'>Fehler:</b> v1: "+ v1 +", v2: "+ v2);
    break;
    case 'coord':
      var s1 = (board.ggbElements[v1])
               ? JXG.getReference(JXG.GeogebraReader.board, JXG.GeogebraReader.board.ggbElements[v1].id)
               : v1;
      var s2 = (board.ggbElements[v2])
               ? JXG.getReference(JXG.GeogebraReader.board, JXG.GeogebraReader.board.ggbElements[v2].id)
               : v2;

      JXG.GeogebraReader.debug("<br/><b>Aktualisierung des Punktes:</b> <li>x[id: "+ s1.id +" type: "+ typeof s1 +", value: "+ s1 +"]</li><li>y[id: "+ s2.id +" type: "+ typeof s2 +", value: "+ s2 +"]</li>");
      if(typeof s2 === 'function') {
          // s2 ist eine Funktion, die von dem Slider s1 abhaengt, z.B. s1^2, der entsprechende Wert wird hier eingesetzt
          p.addConstraint([s1, function() { return s2( s1 ); }]);
      }
      else {
          p.addConstraint([s1, s2]);
      }
    break;
    case 'add':
      return (JXG.isNumber(v1)) ? v1 : parseInt(v1)
             +
             (JXG.isNumber(v2)) ? v2 : parseInt(v2);
    break;
    case 'sub':
      return v1 - v2;
    break;
    case 'mult':
      return v1 * v2;
    break;
    case 'div':
      return v1 / v2;
    break;
    case 'pow':
      var t1 = v1;
      var t2 = v2;
      var s11 = (board.ggbElements[t1])
               ? JXG.getReference(JXG.GeogebraReader.board, JXG.GeogebraReader.board.ggbElements[t1].id)
               : t1;
      var s21 = (board.ggbElements[t2])
               ? JXG.getReference(JXG.GeogebraReader.board, JXG.GeogebraReader.board.ggbElements[t2].id)
               : t2;

      return function(x) { return Math.pow(x, s21); };
    break;
    case 'negmult':
      return v1 * -1;
    break;
    case 'bra':
      return v1;
    break;
    break;
    case 'var':
      if(v2)
        return function() { return v1(v2); };
      else
        return v1;
    break;
    break;
    case 'string':
      return v1;
    break;
    case 'int':
      return v1;
    break;
    case 'float':
      return v1;
    break;
    case 'html':
      return v1;
    break;
    case 'func':
      JXG.GeogebraReader.debug('In FUNC(Act): '+ v1 +', v2: '+ v2);
      v1 = JXG.GeogebraReader.ggbParse(JXG.GeogebraReader.board, v1);
      return v1;
    break;
  }
};

/**
 * JS/CC parser to convert the input expression to a working javascript function.
 * @param {Object} board object
 * @param {Object} element Element that needs to be updated
 * @param {String} exp String which contains the function, expression or information 
 */
this.ggbParse = function(board, exp, element) {
  var element = (element) ? JXG.getReference(board, board.ggbElements[element].id) : false;
  if(element) JXG.GeogebraReader.debug("Zu aktualisierendes Element: "+ element.name + "("+ element.id +")");

  if(JXG.GeogebraReader.format <= 3.01) {
    // prepare string: "solve" multiplications 'a b' to 'a*b'
    var s = exp.split(' ');
    var o = '';
    for(var i=0; i<s.length; i++) {
      if(s.length != i+1)
        if(s[i].search(/\)$/) > -1 || s[i].search(/[0-9]+$/) > -1 || s[i].search(/[a-zA-Z]+(\_*[a-zA-Z0-9]+)*$/) > -1)
          if(s[i+1].search(/^\(/) > -1 || s[i].search(/^[0-9]+/) > -1 || s[i+1].search(/^[a-zA-Z]+(\_*[a-zA-Z0-9]+)*/) > -1)
            s[i] = s[i] + "*";
      o += s[i];
    };
    exp = o;
  }

  // prepare parsing:
  // o = (o.match(/sin/)) ? o.replace(/sin/, "Math.sin") : o; // deprecated
  exp = (exp.match(/\u00B2/)) ? exp.replace(/\u00B2/, '^2') : exp;
  exp = (exp.match(/\u00B2/)) ? exp.replace(/\u00B3/, '^3') : exp;
  // exp = (exp.match(/x\(/)) ? exp.replace(/x\(/, 'X(') : exp;
  // exp = (exp.match(/y\(/)) ? exp.replace(/y\(/, 'Y(') : exp;
  // exp = (exp.match(/sin\(/)) ? exp.replace(/sin\(/, 'SIN(') : exp;

  JXG.GeogebraReader.debug('EXP: '+ exp);

/*
    This parser was generated with: The LALR(1) parser and lexical analyzer generator for JavaScript, written in JavaScript
    In the version 0.30 on http://jscc.jmksf.com/

    It is based on the default template driver for JS/CC generated parsers running as
    browser-based JavaScript/ECMAScript applications and was strongly modified.

    The parser was written 2007, 2008 by Jan Max Meyer, J.M.K S.F. Software Technologies
    This is in the public domain.
*/

/***** begin replace *****/
	var _dbg_withtrace        = false;
	var _dbg_string            = new String();

	function __dbg_print( text ) {
	    _dbg_string += text + "\n";
	}

	function __lex( info ) {
	    var state        = 0;
	    var match        = -1;
	    var match_pos    = 0;
	    var start        = 0;
	    var pos            = info.offset + 1;

	    do
	    {
	        pos--;
	        state = 0;
	        match = -2;
	        start = pos;

	        if( info.src.length <= start )
	            return 19;

	        do
	        {

	switch( state )
	{
	    case 0:
	        if( info.src.charCodeAt( pos ) == 9 || info.src.charCodeAt( pos ) == 32 ) state = 1;
	        else if( info.src.charCodeAt( pos ) == 40 ) state = 2;
	        else if( info.src.charCodeAt( pos ) == 41 ) state = 3;
	        else if( info.src.charCodeAt( pos ) == 42 ) state = 4;
	        else if( info.src.charCodeAt( pos ) == 43 ) state = 5;
	        else if( info.src.charCodeAt( pos ) == 44 ) state = 6;
	        else if( info.src.charCodeAt( pos ) == 45 ) state = 7;
	        else if( info.src.charCodeAt( pos ) == 47 ) state = 8;
	        else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) ) state = 9;
	        else if( ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) ) state = 10;
	        else if( info.src.charCodeAt( pos ) == 94 ) state = 11;
	        else if( info.src.charCodeAt( pos ) == 34 ) state = 17;
	        else if( info.src.charCodeAt( pos ) == 38 ) state = 19;
	        else if( info.src.charCodeAt( pos ) == 46 ) state = 20;
	        else if( info.src.charCodeAt( pos ) == 95 ) state = 21;
	        else state = -1;
	        break;

	    case 1:
	        state = -1;
	        match = 1;
	        match_pos = pos;
	        break;

	    case 2:
	        state = -1;
	        match = 2;
	        match_pos = pos;
	        break;

	    case 3:
	        state = -1;
	        match = 3;
	        match_pos = pos;
	        break;

	    case 4:
	        state = -1;
	        match = 14;
	        match_pos = pos;
	        break;

	    case 5:
	        state = -1;
	        match = 11;
	        match_pos = pos;
	        break;

	    case 6:
	        state = -1;
	        match = 12;
	        match_pos = pos;
	        break;

	    case 7:
	        state = -1;
	        match = 13;
	        match_pos = pos;
	        break;

	    case 8:
	        state = -1;
	        match = 15;
	        match_pos = pos;
	        break;

	    case 9:
	        if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) ) state = 9;
	        else if( info.src.charCodeAt( pos ) == 46 ) state = 13;
	        else state = -1;
	        match = 4;
	        match_pos = pos;
	        break;

	    case 10:
	        if( ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) ) state = 10;
	        else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) ) state = 18;
	        else if( info.src.charCodeAt( pos ) == 40 ) state = 23;
	        else if( info.src.charCodeAt( pos ) == 95 ) state = 24;
	        else state = -1;
	        match = 9;
	        match_pos = pos;
	        break;

	    case 11:
	        state = -1;
	        match = 16;
	        match_pos = pos;
	        break;

	    case 12:
	        state = -1;
	        match = 10;
	        match_pos = pos;
	        break;

	    case 13:
	        if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) ) state = 13;
	        else state = -1;
	        match = 5;
	        match_pos = pos;
	        break;

	    case 14:
	        state = -1;
	        match = 7;
	        match_pos = pos;
	        break;

	    case 15:
	        if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) ) state = 15;
	        else state = -1;
	        match = 6;
	        match_pos = pos;
	        break;

	    case 16:
	        state = -1;
	        match = 8;
	        match_pos = pos;
	        break;

	    case 17:
	        if( info.src.charCodeAt( pos ) == 34 ) state = 12;
	        else if( info.src.charCodeAt( pos ) == 32 || info.src.charCodeAt( pos ) == 46 || ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) ) state = 17;
	        else state = -1;
	        break;

	    case 18:
	        if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) ) state = 18;
	        else if( info.src.charCodeAt( pos ) == 95 ) state = 24;
	        else state = -1;
	        match = 9;
	        match_pos = pos;
	        break;

	    case 19:
	        if( ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) ) state = 22;
	        else state = -1;
	        break;

	    case 20:
	        if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) ) state = 13;
	        else state = -1;
	        break;

	    case 21:
	        if( info.src.charCodeAt( pos ) == 95 ) state = 25;
	        else state = -1;
	        break;

	    case 22:
	        if( info.src.charCodeAt( pos ) == 59 ) state = 14;
	        else if( ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) ) state = 22;
	        else state = -1;
	        break;

	    case 23:
	        if( ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) ) state = 26;
	        else state = -1;
	        break;

	    case 24:
	        if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) ) state = 18;
	        else if( info.src.charCodeAt( pos ) == 95 ) state = 24;
	        else state = -1;
	        break;

	    case 25:
	        if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) ) state = 15;
	        else state = -1;
	        break;

	    case 26:
	        if( info.src.charCodeAt( pos ) == 44 || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) ) state = 26;
	        else if( info.src.charCodeAt( pos ) == 41 ) state = 27;
	        else state = -1;
	        break;

	    case 27:
	        if( info.src.charCodeAt( pos ) == 61 ) state = 16;
	        else state = -1;
	        break;

	}


	            pos++;

	        }
	        while( state > -1 );

	    }
	    while( 1 > -1 && match == 1 );

	    if( match > -1 )
	    {
	        info.att = info.src.substr( start, match_pos - start );
	        info.offset = match_pos;

	switch( match )
	{
	    case 4:
	        {
	         info.att = JXG.GeogebraReader.ggbMatch('int', info.att);
	        }
	        break;

	    case 5:
	        {
	         info.att = JXG.GeogebraReader.ggbMatch('float', info.att);
	        }
	        break;

	    case 7:
	        {
	         info.att = JXG.GeogebraReader.ggbMatch('html', info.att);
	        }
	        break;

	    case 8:
	        {
	         info.att = JXG.GeogebraReader.ggbMatch('func', info.att);
	        }
	        break;

	    case 9:
	        {
	         info.att = JXG.GeogebraReader.ggbMatch('var', info.att);
	        }
	        break;

	    case 10:
	        {
	         info.att = JXG.GeogebraReader.ggbMatch('string', info.att);
	        }
	        break;

	}


	    }
	    else
	    {
	        info.att = new String();
	        match = -1;
	    }

	    return match;
	}


	function __parse( src, err_off, err_la ) {
	    var        sstack            = new Array();
	    var        vstack            = new Array();
	    var     err_cnt            = 0;
	    var        act;
	    var        go;
	    var        la;
	    var        rval;
	    var     parseinfo        = new Function( "", "var offset; var src; var att;" );
	    var        info            = new parseinfo();

	/* Pop-Table */
	var pop_tab = new Array(
	    new Array( 0/* p' */, 1 ),
	    new Array( 18/* p */, 1 ),
	    new Array( 17/* e */, 3 ),
	    new Array( 17/* e */, 3 ),
	    new Array( 17/* e */, 3 ),
	    new Array( 17/* e */, 3 ),
	    new Array( 17/* e */, 3 ),
	    new Array( 17/* e */, 3 ),
	    new Array( 17/* e */, 2 ),
	    new Array( 17/* e */, 3 ),
	    new Array( 17/* e */, 2 ),
	    new Array( 17/* e */, 3 ),
	    new Array( 17/* e */, 1 ),
	    new Array( 17/* e */, 1 ),
	    new Array( 17/* e */, 1 ),
	    new Array( 17/* e */, 1 ),
	    new Array( 17/* e */, 1 ),
	    new Array( 17/* e */, 1 ),
	    new Array( 17/* e */, 4 )
	);

	/* Action-Table */
	var act_tab = new Array(
	    /* State 0 */ new Array( 13/* "-" */,3 , 2/* "(" */,4 , 8/* "FUNC" */,5 , 10/* "STRING" */,6 , 4/* "INT" */,7 , 5/* "FLOAT" */,8 , 6/* "PARAM" */,9 , 7/* "HTML" */,10 , 9/* "VAR" */,11 ),
	    /* State 1 */ new Array( 19/* "$" */,0 ),
	    /* State 2 */ new Array( 16/* "^" */,12 , 15/* "/" */,13 , 14/* "*" */,14 , 13/* "-" */,15 , 11/* "+" */,16 , 12/* "," */,17 , 19/* "$" */,-1 ),
	    /* State 3 */ new Array( 13/* "-" */,3 , 2/* "(" */,4 , 8/* "FUNC" */,5 , 10/* "STRING" */,6 , 4/* "INT" */,7 , 5/* "FLOAT" */,8 , 6/* "PARAM" */,9 , 7/* "HTML" */,10 , 9/* "VAR" */,11 ),
	    /* State 4 */ new Array( 13/* "-" */,3 , 2/* "(" */,4 , 8/* "FUNC" */,5 , 10/* "STRING" */,6 , 4/* "INT" */,7 , 5/* "FLOAT" */,8 , 6/* "PARAM" */,9 , 7/* "HTML" */,10 , 9/* "VAR" */,11 ),
	    /* State 5 */ new Array( 13/* "-" */,3 , 2/* "(" */,4 , 8/* "FUNC" */,5 , 10/* "STRING" */,6 , 4/* "INT" */,7 , 5/* "FLOAT" */,8 , 6/* "PARAM" */,9 , 7/* "HTML" */,10 , 9/* "VAR" */,11 ),
	    /* State 6 */ new Array( 11/* "+" */,21 , 19/* "$" */,-16 , 12/* "," */,-16 , 13/* "-" */,-16 , 14/* "*" */,-16 , 15/* "/" */,-16 , 16/* "^" */,-16 , 3/* ")" */,-16 ),
	    /* State 7 */ new Array( 19/* "$" */,-12 , 12/* "," */,-12 , 11/* "+" */,-12 , 13/* "-" */,-12 , 14/* "*" */,-12 , 15/* "/" */,-12 , 16/* "^" */,-12 , 3/* ")" */,-12 ),
	    /* State 8 */ new Array( 19/* "$" */,-13 , 12/* "," */,-13 , 11/* "+" */,-13 , 13/* "-" */,-13 , 14/* "*" */,-13 , 15/* "/" */,-13 , 16/* "^" */,-13 , 3/* ")" */,-13 ),
	    /* State 9 */ new Array( 19/* "$" */,-14 , 12/* "," */,-14 , 11/* "+" */,-14 , 13/* "-" */,-14 , 14/* "*" */,-14 , 15/* "/" */,-14 , 16/* "^" */,-14 , 3/* ")" */,-14 ),
	    /* State 10 */ new Array( 19/* "$" */,-15 , 12/* "," */,-15 , 11/* "+" */,-15 , 13/* "-" */,-15 , 14/* "*" */,-15 , 15/* "/" */,-15 , 16/* "^" */,-15 , 3/* ")" */,-15 ),
	    /* State 11 */ new Array( 2/* "(" */,22 , 19/* "$" */,-17 , 12/* "," */,-17 , 11/* "+" */,-17 , 13/* "-" */,-17 , 14/* "*" */,-17 , 15/* "/" */,-17 , 16/* "^" */,-17 , 3/* ")" */,-17 ),
	    /* State 12 */ new Array( 13/* "-" */,3 , 2/* "(" */,4 , 8/* "FUNC" */,5 , 10/* "STRING" */,6 , 4/* "INT" */,7 , 5/* "FLOAT" */,8 , 6/* "PARAM" */,9 , 7/* "HTML" */,10 , 9/* "VAR" */,11 ),
	    /* State 13 */ new Array( 13/* "-" */,3 , 2/* "(" */,4 , 8/* "FUNC" */,5 , 10/* "STRING" */,6 , 4/* "INT" */,7 , 5/* "FLOAT" */,8 , 6/* "PARAM" */,9 , 7/* "HTML" */,10 , 9/* "VAR" */,11 ),
	    /* State 14 */ new Array( 13/* "-" */,3 , 2/* "(" */,4 , 8/* "FUNC" */,5 , 10/* "STRING" */,6 , 4/* "INT" */,7 , 5/* "FLOAT" */,8 , 6/* "PARAM" */,9 , 7/* "HTML" */,10 , 9/* "VAR" */,11 ),
	    /* State 15 */ new Array( 13/* "-" */,3 , 2/* "(" */,4 , 8/* "FUNC" */,5 , 10/* "STRING" */,6 , 4/* "INT" */,7 , 5/* "FLOAT" */,8 , 6/* "PARAM" */,9 , 7/* "HTML" */,10 , 9/* "VAR" */,11 ),
	    /* State 16 */ new Array( 13/* "-" */,3 , 2/* "(" */,4 , 8/* "FUNC" */,5 , 10/* "STRING" */,6 , 4/* "INT" */,7 , 5/* "FLOAT" */,8 , 6/* "PARAM" */,9 , 7/* "HTML" */,10 , 9/* "VAR" */,11 ),
	    /* State 17 */ new Array( 13/* "-" */,3 , 2/* "(" */,4 , 8/* "FUNC" */,5 , 10/* "STRING" */,6 , 4/* "INT" */,7 , 5/* "FLOAT" */,8 , 6/* "PARAM" */,9 , 7/* "HTML" */,10 , 9/* "VAR" */,11 ),
	    /* State 18 */ new Array( 16/* "^" */,12 , 15/* "/" */,-8 , 14/* "*" */,-8 , 13/* "-" */,-8 , 11/* "+" */,-8 , 12/* "," */,-8 , 19/* "$" */,-8 , 3/* ")" */,-8 ),
	    /* State 19 */ new Array( 16/* "^" */,12 , 15/* "/" */,13 , 14/* "*" */,14 , 13/* "-" */,15 , 11/* "+" */,16 , 12/* "," */,17 , 3/* ")" */,29 ),
	    /* State 20 */ new Array( 16/* "^" */,12 , 15/* "/" */,13 , 14/* "*" */,14 , 13/* "-" */,15 , 11/* "+" */,16 , 12/* "," */,17 , 19/* "$" */,-10 , 3/* ")" */,-10 ),
	    /* State 21 */ new Array( 13/* "-" */,3 , 2/* "(" */,4 , 8/* "FUNC" */,5 , 10/* "STRING" */,6 , 4/* "INT" */,7 , 5/* "FLOAT" */,8 , 6/* "PARAM" */,9 , 7/* "HTML" */,10 , 9/* "VAR" */,11 ),
	    /* State 22 */ new Array( 13/* "-" */,3 , 2/* "(" */,4 , 8/* "FUNC" */,5 , 10/* "STRING" */,6 , 4/* "INT" */,7 , 5/* "FLOAT" */,8 , 6/* "PARAM" */,9 , 7/* "HTML" */,10 , 9/* "VAR" */,11 ),
	    /* State 23 */ new Array( 16/* "^" */,-7 , 15/* "/" */,-7 , 14/* "*" */,-7 , 13/* "-" */,-7 , 11/* "+" */,-7 , 12/* "," */,-7 , 19/* "$" */,-7 , 3/* ")" */,-7 ),
	    /* State 24 */ new Array( 16/* "^" */,12 , 15/* "/" */,-6 , 14/* "*" */,-6 , 13/* "-" */,-6 , 11/* "+" */,-6 , 12/* "," */,-6 , 19/* "$" */,-6 , 3/* ")" */,-6 ),
	    /* State 25 */ new Array( 16/* "^" */,12 , 15/* "/" */,-5 , 14/* "*" */,-5 , 13/* "-" */,-5 , 11/* "+" */,-5 , 12/* "," */,-5 , 19/* "$" */,-5 , 3/* ")" */,-5 ),
	    /* State 26 */ new Array( 16/* "^" */,12 , 15/* "/" */,13 , 14/* "*" */,14 , 13/* "-" */,-4 , 11/* "+" */,-4 , 12/* "," */,-4 , 19/* "$" */,-4 , 3/* ")" */,-4 ),
	    /* State 27 */ new Array( 16/* "^" */,12 , 15/* "/" */,13 , 14/* "*" */,14 , 13/* "-" */,-3 , 11/* "+" */,-3 , 12/* "," */,-3 , 19/* "$" */,-3 , 3/* ")" */,-3 ),
	    /* State 28 */ new Array( 16/* "^" */,12 , 15/* "/" */,13 , 14/* "*" */,14 , 13/* "-" */,-2 , 11/* "+" */,-2 , 12/* "," */,-2 , 19/* "$" */,-2 , 3/* ")" */,-2 ),
	    /* State 29 */ new Array( 19/* "$" */,-9 , 12/* "," */,-9 , 11/* "+" */,-9 , 13/* "-" */,-9 , 14/* "*" */,-9 , 15/* "/" */,-9 , 16/* "^" */,-9 , 3/* ")" */,-9 ),
	    /* State 30 */ new Array( 16/* "^" */,12 , 15/* "/" */,13 , 14/* "*" */,14 , 13/* "-" */,-11 , 11/* "+" */,-11 , 12/* "," */,-11 , 19/* "$" */,-11 , 3/* ")" */,-11 ),
	    /* State 31 */ new Array( 16/* "^" */,12 , 15/* "/" */,13 , 14/* "*" */,14 , 13/* "-" */,15 , 11/* "+" */,16 , 12/* "," */,17 , 3/* ")" */,32 ),
	    /* State 32 */ new Array( 19/* "$" */,-18 , 12/* "," */,-18 , 11/* "+" */,-18 , 13/* "-" */,-18 , 14/* "*" */,-18 , 15/* "/" */,-18 , 16/* "^" */,-18 , 3/* ")" */,-18 )
	);

	/* Goto-Table */
	var goto_tab = new Array(
	    /* State 0 */ new Array( 18/* p */,1 , 17/* e */,2 ),
	    /* State 1 */ new Array( ),
	    /* State 2 */ new Array( ),
	    /* State 3 */ new Array( 17/* e */,18 ),
	    /* State 4 */ new Array( 17/* e */,19 ),
	    /* State 5 */ new Array( 17/* e */,20 ),
	    /* State 6 */ new Array( ),
	    /* State 7 */ new Array( ),
	    /* State 8 */ new Array( ),
	    /* State 9 */ new Array( ),
	    /* State 10 */ new Array( ),
	    /* State 11 */ new Array( ),
	    /* State 12 */ new Array( 17/* e */,23 ),
	    /* State 13 */ new Array( 17/* e */,24 ),
	    /* State 14 */ new Array( 17/* e */,25 ),
	    /* State 15 */ new Array( 17/* e */,26 ),
	    /* State 16 */ new Array( 17/* e */,27 ),
	    /* State 17 */ new Array( 17/* e */,28 ),
	    /* State 18 */ new Array( ),
	    /* State 19 */ new Array( ),
	    /* State 20 */ new Array( ),
	    /* State 21 */ new Array( 17/* e */,30 ),
	    /* State 22 */ new Array( 17/* e */,31 ),
	    /* State 23 */ new Array( ),
	    /* State 24 */ new Array( ),
	    /* State 25 */ new Array( ),
	    /* State 26 */ new Array( ),
	    /* State 27 */ new Array( ),
	    /* State 28 */ new Array( ),
	    /* State 29 */ new Array( ),
	    /* State 30 */ new Array( ),
	    /* State 31 */ new Array( ),
	    /* State 32 */ new Array( )
	);



	/* Symbol labels */
	var labels = new Array(
	    "p'" /* Non-terminal symbol */,
	    "WHITESPACE" /* Terminal symbol */,
	    "(" /* Terminal symbol */,
	    ")" /* Terminal symbol */,
	    "INT" /* Terminal symbol */,
	    "FLOAT" /* Terminal symbol */,
	    "PARAM" /* Terminal symbol */,
	    "HTML" /* Terminal symbol */,
	    "FUNC" /* Terminal symbol */,
	    "VAR" /* Terminal symbol */,
	    "STRING" /* Terminal symbol */,
	    "+" /* Terminal symbol */,
	    "," /* Terminal symbol */,
	    "-" /* Terminal symbol */,
	    "*" /* Terminal symbol */,
	    "/" /* Terminal symbol */,
	    "^" /* Terminal symbol */,
	    "e" /* Non-terminal symbol */,
	    "p" /* Non-terminal symbol */,
	    "$" /* Terminal symbol */
	);



	    info.offset = 0;
	    info.src = src;
	    info.att = new String();

	    if( !err_off )
	        err_off    = new Array();
	    if( !err_la )
	    err_la = new Array();

	    sstack.push( 0 );
	    vstack.push( 0 );

	    la = __lex( info );

	    while( true )
	    {
	        act = 34;
	        for( var i = 0; i < act_tab[sstack[sstack.length-1]].length; i+=2 )
	        {
	            if( act_tab[sstack[sstack.length-1]][i] == la )
	            {
	                act = act_tab[sstack[sstack.length-1]][i+1];
	                break;
	            }
	        }

	        if( _dbg_withtrace && sstack.length > 0 )
	        {
	            __dbg_print( "\nState " + sstack[sstack.length-1] + "\n" +
	                            "\tLookahead: " + labels[la] + " (\"" + info.att + "\")\n" +
	                            "\tAction: " + act + "\n" +
	                            "\tSource: \"" + info.src.substr( info.offset, 30 ) + ( ( info.offset + 30 < info.src.length ) ?
	                                    "..." : "" ) + "\"\n" +
	                            "\tStack: " + sstack.join() + "\n" +
	                            "\tValue stack: " + vstack.join() + "\n" );
	        }


	        //Panic-mode: Try recovery when parse-error occurs!
	        if( act == 34 )
	        {
	            if( _dbg_withtrace )
	                __dbg_print( "Error detected: There is no reduce or shift on the symbol " + labels[la] );

	            err_cnt++;
	            err_off.push( info.offset - info.att.length );            
	            err_la.push( new Array() );
	            for( var i = 0; i < act_tab[sstack[sstack.length-1]].length; i+=2 )
	                err_la[err_la.length-1].push( labels[act_tab[sstack[sstack.length-1]][i]] );

	            //Remember the original stack!
	            var rsstack = new Array();
	            var rvstack = new Array();
	            for( var i = 0; i < sstack.length; i++ )
	            {
	                rsstack[i] = sstack[i];
	                rvstack[i] = vstack[i];
	            }

	            while( act == 34 && la != 19 )
	            {
	                if( _dbg_withtrace )
	                    __dbg_print( "\tError recovery\n" +
	                                    "Current lookahead: " + labels[la] + " (" + info.att + ")\n" +
	                                    "Action: " + act + "\n\n" );
	                if( la == -1 )
	                    info.offset++;

	                while( act == 34 && sstack.length > 0 )
	                {
	                    sstack.pop();
	                    vstack.pop();

	                    if( sstack.length == 0 )
	                        break;

	                    act = 34;
	                    for( var i = 0; i < act_tab[sstack[sstack.length-1]].length; i+=2 )
	                    {
	                        if( act_tab[sstack[sstack.length-1]][i] == la )
	                        {
	                            act = act_tab[sstack[sstack.length-1]][i+1];
	                            break;
	                        }
	                    }
	                }

	                if( act != 34 )
	                    break;

	                for( var i = 0; i < rsstack.length; i++ )
	                {
	                    sstack.push( rsstack[i] );
	                    vstack.push( rvstack[i] );
	                }

	                la = __lex( info );
	            }

	            if( act == 34 )
	            {
	                if( _dbg_withtrace )
	                    __dbg_print( "\tError recovery failed, terminating parse process..." );
	                break;
	            }


	            if( _dbg_withtrace )
	                __dbg_print( "\tError recovery succeeded, continuing" );
	        }

	        /*
	        if( act == 34 )
	            break;
	        */


	        //Shift
	        if( act > 0 )
	        {            
	            if( _dbg_withtrace )
	                __dbg_print( "Shifting symbol: " + labels[la] + " (" + info.att + ")" );

	            sstack.push( act );
	            vstack.push( info.att );

	            la = __lex( info );

	            if( _dbg_withtrace )
	                __dbg_print( "\tNew lookahead symbol: " + labels[la] + " (" + info.att + ")" );
	        }
	        //Reduce
	        else
	        {        
	            act *= -1;

	            if( _dbg_withtrace )
	                __dbg_print( "Reducing by producution: " + act );

	            rval = void(0);

	            if( _dbg_withtrace )
	                __dbg_print( "\tPerforming semantic action..." );

	switch( act )
	{
	    case 0:
	    {
	        rval = vstack[ vstack.length - 1 ];
	    }
	    break;
	    case 1:
	    {
	         JXG.GeogebraReader.ggbAct('error', vstack[ vstack.length - 1 ]);
	    }
	    break;
	    case 2:
	    {
	         rval = JXG.GeogebraReader.ggbAct('coord', vstack[ vstack.length - 3 ], vstack[ vstack.length - 1 ], element);
	    }
	    break;
	    case 3:
	    {
	         rval = JXG.GeogebraReader.ggbAct('add', vstack[ vstack.length - 3 ], vstack[ vstack.length - 1 ]);
	    }
	    break;
	    case 4:
	    {
	         rval = JXG.GeogebraReader.ggbAct('sub', vstack[ vstack.length - 3 ], vstack[ vstack.length - 1 ]);
	    }
	    break;
	    case 5:
	    {
	         rval = JXG.GeogebraReader.ggbAct('mult', vstack[ vstack.length - 3 ], vstack[ vstack.length - 1 ]);
	    }
	    break;
	    case 6:
	    {
	         rval = JXG.GeogebraReader.ggbAct('div', vstack[ vstack.length - 3 ], vstack[ vstack.length - 1 ]);
	    }
	    break;
	    case 7:
	    {
	         rval = JXG.GeogebraReader.ggbAct('pow', vstack[ vstack.length - 3 ], vstack[ vstack.length - 1 ]);
	    }
	    break;
	    case 8:
	    {
	         rval = JXG.GeogebraReader.ggbAct('negmult', vstack[ vstack.length - 1 ]);
	    }
	    break;
	    case 9:
	    {
	         rval = JXG.GeogebraReader.ggbAct('bra', vstack[ vstack.length - 2 ]);
	    }
	    break;
	    case 10:
	    {
	         rval = JXG.GeogebraReader.ggbAct('func', vstack[ vstack.length - 2 ], vstack[ vstack.length - 1 ]);
	    }
	    break;
	    case 11:
	    {
	         rval = JXG.GeogebraReader.ggbAct('string', vstack[ vstack.length - 3 ]);
	    }
	    break;
	    case 12:
	    {
	        rval = vstack[ vstack.length - 1 ];
	    }
	    break;
	    case 13:
	    {
	        rval = vstack[ vstack.length - 1 ];
	    }
	    break;
	    case 14:
	    {
	        rval = vstack[ vstack.length - 1 ];
	    }
	    break;
	    case 15:
	    {
	        rval = vstack[ vstack.length - 1 ];
	    }
	    break;
	    case 16:
	    {
	        rval = vstack[ vstack.length - 1 ];
	    }
	    break;
	    case 17:
	    {
	         rval = JXG.GeogebraReader.ggbAct('var', vstack[ vstack.length - 1 ]);
	    }
	    break;
	    case 18:
	    {
	         rval = JXG.GeogebraReader.ggbAct('var', vstack[ vstack.length - 4 ], vstack[ vstack.length - 2 ]);
	    }
	    break;
	}



	            if( _dbg_withtrace )
	                __dbg_print( "\tPopping " + pop_tab[act][1] + " off the stack..." );

	            for( var i = 0; i < pop_tab[act][1]; i++ )
	            {
	                sstack.pop();
	                vstack.pop();
	            }

	            go = -1;
	            for( var i = 0; i < goto_tab[sstack[sstack.length-1]].length; i+=2 )
	            {
	                if( goto_tab[sstack[sstack.length-1]][i] == pop_tab[act][0] )
	                {
	                    go = goto_tab[sstack[sstack.length-1]][i+1];
	                    break;
	                }
	            }

	            if( act == 0 )
	                break;

	            if( _dbg_withtrace )
	                __dbg_print( "\tPushing non-terminal " + labels[ pop_tab[act][0] ] );

	            sstack.push( go );
	            vstack.push( rval );            
	        }

	        if( _dbg_withtrace )
	        {        
	            JXG.GeogebraReader.debug( _dbg_string );
	            _dbg_string = new String();
	        }
	    }

	    if( _dbg_withtrace )
	    {
	        __dbg_print( "\nParse complete." );
	        JXG.GeogebraReader.debug( _dbg_string );
	    }

	    return err_cnt;
	}
/***** end replace *****/
  
  var error_offsets = new Array();
  var error_lookaheads = new Array();
  var error_count = 0;
  var str = exp;
  if( ( error_count = __parse( str, error_offsets, error_lookaheads ) ) > 0 ) {
    var errstr = new String();
    for( var i = 0; i < error_count; i++ )
      errstr += "Parse error in line " + ( str.substr( 0, error_offsets[i] ).match( /\n/g ) ? str.substr( 0, error_offsets[i] ).match( /\n/g ).length : 1 ) + " near \"" + str.substr( error_offsets[i] ) + "\", expecting \"" + error_lookaheads[i].join() + "\"\n" ;
    JXG.GeogebraReader.debug( errstr );
  }
JXG.GeogebraReader.debug('<b style="color:red">ende</b>: '+ str);
  return str;
}; //end: ggbParse()


this.debug = function(s) {
  document.getElementById('debug').innerHTML += s +"<br/>";
};

/**
 * Set color properties of a geogebra element.
 * Set stroke, fill, lighting, label and draft color attributes.
 * @param {Object} gxtEl element of which attributes are to set
 * @param {Object} attr object carrying all necessary attribute values
 * @return {Object} returning the updated attr-attributes object
 */
this.colorProperties = function(Data, attr) {
  var a = (Data.getElementsByTagName("objColor")[0].attributes["alpha"]) ? 1*Data.getElementsByTagName("objColor")[0].attributes["alpha"].value : 0;
  var r = (Data.getElementsByTagName("objColor")[0].attributes["r"]) ? (1*Data.getElementsByTagName("objColor")[0].attributes["r"].value).toString(16) : 0;
  var g = (Data.getElementsByTagName("objColor")[0].attributes["g"]) ? (1*Data.getElementsByTagName("objColor")[0].attributes["g"].value).toString(16) : 0;
  var b = (Data.getElementsByTagName("objColor")[0].attributes["b"]) ? (1*Data.getElementsByTagName("objColor")[0].attributes["b"].value).toString(16) : 0;
  if (r.length == 1) r = '0' + r;
  if (g.length == 1) g = '0' + g;
  if (b.length == 1) b = '0' + b;

  attr.fillColor = '#'+ r + g + b;
  attr.strokeColor = attr.fillColor;
  attr.fillOpacity = a;

  return attr;
}; 

/**
 * Set the board properties.
 * Set active, area, dash, draft and showinfo attributes.
 * @param {Object} gxtEl element of which attributes are to set
 * @param {Object} Data element of which attributes are to set
 * @param {Object} attr object containing the necessary attribute values
 */
this.boardProperties = function(gxtEl, Data, attr) {
  return attr;
}; 

/**
 * @param {Object} gxtEl element of which attributes are to set
 * @param {Object} Data element of which attributes are to set
 * @return {Object} updated element
 */
this.coordinates = function(gxtEl, Data) {
  gxtEl.x = (Data.getElementsByTagName("coords")[0]) ? parseFloat(Data.getElementsByTagName("coords")[0].attributes["x"].value) : (Data.getElementsByTagName("startPoint")[0]) ? parseFloat(Data.getElementsByTagName("startPoint")[0].attributes["x"].value) : false;
  gxtEl.y = (Data.getElementsByTagName("coords")[0]) ? parseFloat(Data.getElementsByTagName("coords")[0].attributes["y"].value) : (Data.getElementsByTagName("startPoint")[0]) ? parseFloat(Data.getElementsByTagName("startPoint")[0].attributes["y"].value) : false;
  gxtEl.z = (Data.getElementsByTagName("coords")[0]) ? parseFloat(Data.getElementsByTagName("coords")[0].attributes["z"].value) : (Data.getElementsByTagName("startPoint")[0]) ? parseFloat(Data.getElementsByTagName("startPoint")[0].attributes["z"].value) : false;
  return gxtEl;
};

/**
 * Writing element attributes to the given object
 * @param {XMLNode} Data expects the content of the current element
 * @return {Object} object with according attributes
 */
this.visualProperties = function(Data, attr) {
  (Data.getElementsByTagName("show")[0].attributes["object"]) ? attr.visible = Data.getElementsByTagName("show")[0].attributes["object"].value : false;
  (Data.getElementsByTagName("show")[0].attributes["label"]) ? attr.visibleLabel = Data.getElementsByTagName("show")[0].attributes["label"].value : false;
  (Data.getElementsByTagName('pointSize')[0]) ? attr.style = Data.getElementsByTagName('pointSize')[0].attributes["val"].value : false;
  (Data.getElementsByTagName("labelOffset")[0]) ? attr.labelX = 1*Data.getElementsByTagName("labelOffset")[0].attributes["x"].value : false;
  (Data.getElementsByTagName("labelOffset")[0]) ? attr.labelY = 1*Data.getElementsByTagName("labelOffset")[0].attributes["y"].value : false;
  (Data.getElementsByTagName("trace")[0]) ? attr.trace = Data.getElementsByTagName("trace")[0].attributes["val"].value : false;
  (Data.getElementsByTagName('fix')[0]) ? attr.fixed = Data.getElementsByTagName('fix')[0].attributes["val"].value : false;
  return attr;
};

/**
 * Searching for an element in the geogebra tree
 * @param {String} the name of the element to search for
 * @param {Boolean} whether it is search for an expression or not
 * @return {Object} object with according label
 */
this.getElement = function(name, expr) {
  expr = expr || false;
  for(var i=0; i<JXG.GeogebraReader.tree.getElementsByTagName("construction").length; i++)
    if(expr == false) {
      for(var j=0; j<JXG.GeogebraReader.tree.getElementsByTagName("construction")[i].getElementsByTagName("element").length; j++) {
        var Data = JXG.GeogebraReader.tree.getElementsByTagName("construction")[i].getElementsByTagName("element")[j];
        if(name == Data.attributes["label"].value) {
          return Data;
        }
      };
    } else {
      for(var j=0; j<JXG.GeogebraReader.tree.getElementsByTagName("construction")[i].getElementsByTagName("expression").length; j++) {
        var Data = JXG.GeogebraReader.tree.getElementsByTagName("construction")[i].getElementsByTagName("expression")[j];
        if(name == Data.attributes["label"].value) {
          return Data;
        }
      };
    }
};

/**
 * Prepare expression for this.ggbParse with solving multiplications and replacing mathematical functions.
 * @param {String} exp Expression to parse and correct
 * @return {String} correct expression with fixed function and multiplication
 */
this.functionParse = function(exp) {
    // search for function params
    if(exp.match(/[a-zA-Z0-9]+\([a-zA-Z0-9]+[a-zA-Z0-9,\ ]*\)[\ ]*[=][\ ]*[a-zA-Z0-9\+\-\*\/]+/)) {
      var input = exp.split('(')[1].split(')')[0];
      var vars = input.split(', ');

      var output = [];
      for(var i=0; i<vars.length; i++)
        output.push("__"+vars[i]);

      var expr = exp.split('=')[1];
      for(var i=0; i<vars.length; i++)
        expr = expr.replace(eval('/'+vars[i]+'/g'), '__'+vars[i]);

      output.push(expr);
      // JXG.GeogebraReader.debug("* out: "+ output.toString());
      return output;
    } else {
      return exp;
    }
};

/**
 * Searching for an element in the geogebra tree
 * @param {Object} board object
 */
this.writeBoard = function(board) {
  var boardData = JXG.GeogebraReader.tree.getElementsByTagName("euclidianView")[0];

  board.origin = {};
  board.origin.usrCoords = [1, 0, 0];
  board.origin.scrCoords = [1, 1*boardData.getElementsByTagName("coordSystem")[0].attributes["xZero"].value, 1*boardData.getElementsByTagName("coordSystem")[0].attributes["yZero"].value];
  // board.zoomX = 1*boardData.getElementsByTagName("coordSystem")[0].attributes["scale"].value;
  // board.zoomY = 1*boardData.getElementsByTagName("coordSystem")[0].attributes["yscale"].value;
  board.unitX = (boardData.getElementsByTagName("coordSystem")[0].attributes["scale"]) ? 1*boardData.getElementsByTagName("coordSystem")[0].attributes["scale"].value : 1;
  board.unitY = (boardData.getElementsByTagName("coordSystem")[0].attributes["yscale"]) ? 1*boardData.getElementsByTagName("coordSystem")[0].attributes["yscale"].value : board.unitX;
  board.stretchX = board.zoomX*board.unitX;
  board.stretchY = board.zoomY*board.unitY;
  
  board.fontSize = 1*JXG.GeogebraReader.tree.getElementsByTagName("gui")[0].getElementsByTagName("font")[0].attributes["size"].value;

  JXG.JSXGraph.boards[board.id] = board;

  // Update of properties during update() is not necessary in GEONExT files
  board.renderer.enhancedRendering = true;

  // snap to grid
  var snap = (boardData.getElementsByTagName('evSettings')[0].attributes["pointCapturing"].value == "true") ? board.snapToGrid = true : null;

  var grid = (boardData.getElementsByTagName('evSettings')[0].attributes["grid"].value == "true") ? board.renderer.drawGrid(board) : null;

  if(boardData.getElementsByTagName('evSettings')[0].attributes["axes"] && boardData.getElementsByTagName('evSettings')[0].attributes["axes"].value == "true") {
      board.ggbElements["xAxis"] = board.create('axis', [[0, 0], [1, 0]], {strokeColor:'black'});
      board.ggbElements["yAxis"] = board.create('axis', [[0, 0], [0, 1]], {strokeColor:'black'});
  }
};

/**
 * Searching for an element in the geogebra tree
 * @param {Object} board object
 * @param {Object} ggb element whose attributes are to parse
 * @param {Array} input list of all input elements
 * @param {String} typeName output construction method
 * @return {Object} return newly created element or false
 */
this.writeElement = function(board, output, input, cmd) {
  element = (typeof output === 'object' && typeof output.attributes === 'undefined') ? output[0] : output;

  var gxtEl = {}; // geometric element

  gxtEl.type = (element.attributes['type'] && typeof cmd === 'undefined') ? element.attributes['type'].value.toLowerCase() : cmd;
  gxtEl.label = element.attributes['label'].value;

  var attr = {}; // Attributes of geometric elements
  attr.name  = gxtEl.label;

  // if(typeof cmd !== 'undefined' && gxtEl.type !== cmd) {
  //   gxtEl.type = cmd;
  // }

  JXG.GeogebraReader.debug("<br><b>Konstruiere</b> "+ attr.name +"("+ gxtEl.type +"):");

  switch(gxtEl.type) {
    case "point":
      attr = JXG.GeogebraReader.boardProperties(gxtEl, element, attr);
      attr = JXG.GeogebraReader.colorProperties(element, attr);
      gxtEl = JXG.GeogebraReader.coordinates(gxtEl, element);
      attr = JXG.GeogebraReader.visualProperties(element, attr);

      try {
          p = board.create('point', [gxtEl.x, gxtEl.y], attr);
          JXG.GeogebraReader.debug("* <b>Point ("+ p.id +"):</b> "+ attr.name + "("+ gxtEl.x +", "+ gxtEl.y +")<br>\n");
          return p;
      } catch(e) {
          JXG.GeogebraReader.debug("* <b>Err:</b> Point " + attr.name +"<br>\n");
          return false;
      }
    break;
    case 'segment':
      attr = JXG.GeogebraReader.boardProperties(gxtEl, element, attr);
      attr = JXG.GeogebraReader.colorProperties(element, attr);
      gxtEl = JXG.GeogebraReader.coordinates(gxtEl, element);
      attr = JXG.GeogebraReader.visualProperties(element, attr);

      try {
        JXG.GeogebraReader.debug("* <b>Segment:</b> ("+ attr.name +") First: " + input[0].name + ", Last: " + input[1].name + "<br>\n");
        attr.straightFirst = false;
        attr.straightLast =  false;
        l = board.create('line', input, attr);
        return l;
      } catch(e) {
        JXG.GeogebraReader.debug("* <b>Err:</b> Segment " + attr.name +" First: " + input[0].name + ", Last: " + input[1].name + "<br>\n");
        return false;
      }
    break;
    case 'line':
      attr = JXG.GeogebraReader.boardProperties(gxtEl, element, attr);
      attr = JXG.GeogebraReader.colorProperties(element, attr);
      gxtEl = JXG.GeogebraReader.coordinates(gxtEl, element);
      attr = JXG.GeogebraReader.visualProperties(element, attr);

      if(JXG.getReference(board, input[1].id).type == 1330925652) var type = 'line'; // Punkt -> Gerade
      else if(JXG.getReference(board, input[1].id).type == 1330924622) var type = 'parallel'; // Parallele durch Punkt

      try {
        JXG.GeogebraReader.debug("* <b>Line:</b> ("+ attr.name +") First: " + input[0].id + ", Last: " + input[1].id + "<br>\n");
        l = board.create(type, input, attr);
        return l;
      } catch(e) {
        JXG.GeogebraReader.debug("* <b>Err:</b> Line " + attr.label +"<br>\n");
        return false;
      }
    break;
    case "orthogonalline":
      attr = JXG.GeogebraReader.boardProperties(gxtEl, element, attr);
      attr = JXG.GeogebraReader.colorProperties(element, attr);
      gxtEl = JXG.GeogebraReader.coordinates(gxtEl, element);
      attr = JXG.GeogebraReader.visualProperties(element, attr);

      try {
        JXG.GeogebraReader.debug("* <b>Orthogonalline:</b> First: " + input[0].id + ", Last: " + input[1].id + "<br>\n");
        l = board.create('normal', [input[0], input[1]], attr);
        return l;
      } catch(e) {
        JXG.GeogebraReader.debug("* <b>Err:</b> Orthogonalline " + attr.label +"<br>\n");
        return false;
      }
    break;
    case "polygon":
      attr = JXG.GeogebraReader.boardProperties(gxtEl, element, attr);
      attr = JXG.GeogebraReader.colorProperties(element, attr);
      gxtEl = JXG.GeogebraReader.coordinates(gxtEl, element);
      attr = JXG.GeogebraReader.visualProperties(element, attr);

      // to get the corner count and
      var corner;
      for(var i=0; i<input.length; i++) if(JXG.isNumber(parseInt(input[i]))) corner = parseInt(input[i]);
      JXG.GeogebraReader.debug('Ecken: '+ corner);

      // TODO fixed points with regular polygons
      try {
        JXG.GeogebraReader.debug("* <b>Polygon:</b> First: " + input[0].name + ", Second: " + input[1].name + ", Third: " + input[2].name + "<br>\n");

        var borders = [];
        var length = output.length;
        if(JXG.isNumber(corner) && corner > 0) length -= (corner - 2); // to avoid appending the constructed polygon corner
        for(var i=1; i<length; i++) {
          borders[i-1] = {};
          borders[i-1].id = '';
          borders[i-1].name = output[i].attributes['label'].value;
          JXG.GeogebraReader.debug("border["+ typeof borders[i-1] +"]: "+ borders[i-1].name);
        }
        attr.borders = borders;

        var points = [];
        for(var i=0; i<input.length; i++) {
          if(typeof input[i] === 'object') {
            points.push(input[i]);
            JXG.GeogebraReader.debug("input-queue: added "+ input[i].name);
          }
        }

        for(var i=(output.length - corner + 2); i<output.length; i++) {
          var el = output[i].attributes['label'].value;
          // Construct the corner if not yet registered
          if(typeof board.ggbElements[el] == 'undefined' || board.ggbElements[el] == '') {
            board.ggbElements[el] = JXG.GeogebraReader.writeElement(board, output[i]);
          }
          points.push(board.ggbElements[el]);
        }

        l = board.create('polygon', points, attr);
        return l;
      } catch(e) {
        JXG.GeogebraReader.debug("* <b>Err:</b> Polygon " + attr.name +"<br>\n");
        return false;
      }
    break;
    case 'intersect':
      attr = JXG.GeogebraReader.boardProperties(gxtEl, element, attr);
      attr = JXG.GeogebraReader.colorProperties(element, attr);
      gxtEl = JXG.GeogebraReader.coordinates(gxtEl, element);
      attr = JXG.GeogebraReader.visualProperties(element, attr);

      try {
        JXG.GeogebraReader.debug("* <b>Intersection:</b> First: " + input[0].name + ", Second: " + input[1].name + "<br>\n");
        l = board.create('intersection', [input[0], input[1], 0], attr);
        return l;
      } catch(e) {
        JXG.GeogebraReader.debug("* <b>Err:</b> Intersection " + attr.name +"<br>\n");
        return false;
      }
    break;
    case 'distance':
      attr = JXG.GeogebraReader.boardProperties(gxtEl, element, attr);
      attr = JXG.GeogebraReader.colorProperties(element, attr);
      gxtEl = JXG.GeogebraReader.coordinates(gxtEl, element);
      attr = JXG.GeogebraReader.visualProperties(element, attr);
      
      try {
        JXG.GeogebraReader.debug("* <b>Distance:</b> First: " + input[0].name + ", Second: " + input[1].name + "<br>\n");
        m = board.create('midpoint', input, {visible: 'false'});
        t = board.create('text', [function(){return m.X();}, function(){return m.Y();}, function(){
              return "<span style='text-decoration: overline'>"+ input[0].name + input[1].name +"</span> = "
                     + JXG.getReference(board, input[0].id).Dist(JXG.getReference(board, input[1].id));
                }]);
        return t;
      } catch(e) {
        JXG.GeogebraReader.debug("* <b>Err:</b> Intersection " + attr.name +"<br>\n");
        return false;
      }
    break;
    case 'vector':
      attr = JXG.GeogebraReader.boardProperties(gxtEl, element, attr);
      attr = JXG.GeogebraReader.colorProperties(element, attr);
      gxtEl = JXG.GeogebraReader.coordinates(gxtEl, element);
      attr = JXG.GeogebraReader.visualProperties(element, attr);

      try {
        JXG.GeogebraReader.debug("* <b>Vector:</b> First: " + input[0].name + ", Second: " + input[1].name + "<br>\n");
        v = board.create('arrow', input, attr);
        return v;
      } catch(e) {
        JXG.GeogebraReader.debug("* <b>Err:</b> Vector " + attr.name +"<br>\n");
        return false;
      }
    break;
    case 'rotate':
      attr = JXG.GeogebraReader.boardProperties(gxtEl, element, attr);
      attr = JXG.GeogebraReader.colorProperties(element, attr);
      gxtEl = JXG.GeogebraReader.coordinates(gxtEl, element);
      attr = JXG.GeogebraReader.visualProperties(element, attr);

      try {
        JXG.GeogebraReader.debug("* <b>Rotate:</b> First: " + input[0].name + ", Second: " + input[1] + "<br>\n");
        attr.type = 'rotate';
        var d = parseInt(input[1]);
        r = board.create('transform', [d, input[2]], {type:'rotate'});
        p = board.create('point', [input[0], r], attr);
        return p;
      } catch(e) {
        JXG.GeogebraReader.debug("* <b>Err:</b> Rotate " + attr.name +"<br>\n");
        return false;
      }
    break;
    case 'dilate':
      attr = JXG.GeogebraReader.boardProperties(gxtEl, element, attr);
      attr = JXG.GeogebraReader.colorProperties(element, attr);
      gxtEl = JXG.GeogebraReader.coordinates(gxtEl, element);
      attr = JXG.GeogebraReader.visualProperties(element, attr);

      try {
        JXG.GeogebraReader.debug("* <b>Dilate:</b> First: " + input[0].name + ", Second: " + input[1] + "<br>\n");
        attr.type = 'rotate';
        var d = parseInt(input[1]);
        d1 = board.create('transform', [d, d], {type:'scale'});
        d2 = board.create('transform', [function() { return (1-d) * input[2].X(); },
                                               function() { return (1-d) * input[2].Y(); }], {type:'translate'});
        p = board.create('point', [input[0], [d1, d2]], attr);
        return p;
      } catch(e) {
        JXG.GeogebraReader.debug("* <b>Err:</b> Dilate " + attr.name +"<br>\n");
        return false;
      }
    break;
    case 'translate':
      attr = JXG.GeogebraReader.boardProperties(gxtEl, element, attr);
      attr = JXG.GeogebraReader.colorProperties(element, attr);
      gxtEl = JXG.GeogebraReader.coordinates(gxtEl, element);
      attr = JXG.GeogebraReader.visualProperties(element, attr);

      try {
      t = board.create('transform', [function() { return input[1].point2.X()-input[1].point1.X(); },
                                            function() { return input[1].point2.Y()-input[1].point1.Y(); }], {type:'translate'});
      p = board.create('point', [input[0], t], attr);        
        return p;
      } catch(e) {
        JXG.GeogebraReader.debug("* <b>Err:</b> Translate " + attr.name +"<br>\n");
        return false;
      }
    break;
    case 'mirror':
      attr = JXG.GeogebraReader.boardProperties(gxtEl, element, attr);
      attr = JXG.GeogebraReader.colorProperties(element, attr);
      gxtEl = JXG.GeogebraReader.coordinates(gxtEl, element);
      attr = JXG.GeogebraReader.visualProperties(element, attr);

      if(JXG.getReference(board, input[1].id).type == 1330925652) var type = 'mirrorpoint'; // Punktspiegelung
      else if(JXG.getReference(board, input[1].id).type == 1330924622) var type = 'reflection'; // Geradenspiegelung

      try {
        JXG.GeogebraReader.debug("* <b>Mirror:</b> First: " + input[0].name + ", Second: " + input[1].name + "<br>\n");
        m = board.create(type, [input[1], input[0]], attr);
        return m;
      } catch(e) {
        JXG.GeogebraReader.debug("* <b>Err:</b> Mirror " + attr.name +"<br>\n");
        return false;
      }
    break;
    case 'circle':
      attr = JXG.GeogebraReader.boardProperties(gxtEl, element, attr);
      attr = JXG.GeogebraReader.colorProperties(element, attr);
      gxtEl = JXG.GeogebraReader.coordinates(gxtEl, element);
      attr = JXG.GeogebraReader.visualProperties(element, attr);

      try {
        JXG.GeogebraReader.debug("* <b>Circle:</b> First: " + input[0].name + ", Second: " + input[1] + "<br>\n");
        c = board.create('circle', input, attr);
        return c;
      } catch(e) {
        JXG.GeogebraReader.debug("* <b>Err:</b> Circle " + attr.name +"<br>\n");
        return false;
      }
    break;
    case 'circlearc':
      attr = JXG.GeogebraReader.boardProperties(gxtEl, element, attr);
      attr = JXG.GeogebraReader.colorProperties(element, attr);
      gxtEl = JXG.GeogebraReader.coordinates(gxtEl, element);
      attr = JXG.GeogebraReader.visualProperties(element, attr);

      try {
        JXG.GeogebraReader.debug("* <b>CircleArc:</b> First: " + input[0].name + ", Second: " + input[1].name + "<br>\n");
        c = board.create('arc', input, attr);
        return c;
      } catch(e) {
        JXG.GeogebraReader.debug("* <b>Err:</b> CircleArc " + attr.name +"<br>\n");
        return false;
      }
    break;
    // case 'conic':
    //   attr = JXG.GeogebraReader.boardProperties(gxtEl, element, attr);
    //   attr = JXG.GeogebraReader.colorProperties(element, attr);
    //   gxtEl = JXG.GeogebraReader.coordinates(gxtEl, element);
    //   attr = JXG.GeogebraReader.visualProperties(element, attr);
    // 
    //   try {
    //     JXG.GeogebraReader.debug("* <b>Conic:</b> First: " + input[0].name + ", Second: " + input[1].name + "<br>\n");
    //     c = board.create('conic', input, attr);
    //     return c;
    //   } catch(e) {
    //     JXG.GeogebraReader.debug("* <b>Err:</b> Conic " + attr.name +"<br>\n");
    //     return false;
    //   }
    // break;
    case 'circlesector':
      attr = JXG.GeogebraReader.boardProperties(gxtEl, element, attr);
      attr = JXG.GeogebraReader.colorProperties(element, attr);
      gxtEl = JXG.GeogebraReader.coordinates(gxtEl, element);
      attr = JXG.GeogebraReader.visualProperties(element, attr);

      try {
        JXG.GeogebraReader.debug("* <b>CircleSector:</b> First: " + input[0].name + ", Second: " + input[1].name + "<br>\n");
        c = board.create('sector', input, attr);
        return c;
      } catch(e) {
        JXG.GeogebraReader.debug("* <b>Err:</b> CircleSector " + attr.name +"<br>\n");
        return false;
      }
    break;
    case 'linebisector':
      attr = JXG.GeogebraReader.boardProperties(gxtEl, element, attr);
      attr = JXG.GeogebraReader.colorProperties(element, attr);
      gxtEl = JXG.GeogebraReader.coordinates(gxtEl, element);
      attr = JXG.GeogebraReader.visualProperties(element, attr);

      try {
        JXG.GeogebraReader.debug("* <b>LineBiSector (Mittelsenkrechte):</b> First: " + input[0].name + "<br>\n");
        attr.straightFirst = true;
        attr.straightLast =  true;

        m = board.create('midpoint', input, {visible: 'false'});
        if(JXG.getReference(board, input[0].id).type == 1330925652 && JXG.getReference(board, input[1].id).type == 1330925652) {
          l = board.create('line', input, {visible: 'false'});
          p = board.create('perpendicular', [m, l], attr);
        } else {
          p = board.create('perpendicular', [m, input[0]], attr);
        }
        return p[0];
      } catch(e) {
        JXG.GeogebraReader.debug("* <b>Err:</b> LineBiSector (Mittelsenkrechte) " + attr.name +"<br>\n");
        return false;
      }
    break;
    case 'ray':
      attr = JXG.GeogebraReader.boardProperties(gxtEl, element, attr);
      attr = JXG.GeogebraReader.colorProperties(element, attr);
      gxtEl = JXG.GeogebraReader.coordinates(gxtEl, element);
      attr = JXG.GeogebraReader.visualProperties(element, attr);

      try {
        JXG.GeogebraReader.debug("* <b>Ray:</b> First: " + input[0].name + "<br>\n");
        attr.straightFirst = true;
        attr.straightLast =  false;
        p = board.create('line', [input[1], input[0]], attr);
        return p;
      } catch(e) {
        JXG.GeogebraReader.debug("* <b>Err:</b> Ray " + attr.name +"<br>\n");
        return false;
      }
    break;
    case 'tangent':
      attr = JXG.GeogebraReader.boardProperties(gxtEl, element, attr);
      attr = JXG.GeogebraReader.colorProperties(element, attr);
      gxtEl = JXG.GeogebraReader.coordinates(gxtEl, element);
      attr = JXG.GeogebraReader.visualProperties(element, attr);

      try {
        JXG.GeogebraReader.debug("* <b>Tangent:</b> First: " + input[0].name + ", Sec.: "+ input[1].name +"<br>\n");
        var m = function(circ) {
        return [[circ.midpoint.X()*circ.midpoint.X()+circ.midpoint.Y()*circ.midpoint.Y()-circ.getRadius()*circ.getRadius(),
                     -circ.midpoint.X(),-circ.midpoint.Y()],
                    [-circ.midpoint.X(),1,0],
                    [-circ.midpoint.Y(),0,1]
                   ];
            };
        var t = board.create('line', [
                    function(){ return JXG.Math.matVecMult(m(input[1]), input[0].coords.usrCoords)[0]; },
                    function(){ return JXG.Math.matVecMult(m(input[1]), input[0].coords.usrCoords)[1]; },
                    function(){ return JXG.Math.matVecMult(m(input[1]), input[0].coords.usrCoords)[2]; }
                ], {visible:false});
        var i1 = board.create('intersection', [input[1],t,0],{visible:false});
        var i2 = board.create('intersection', [input[1],t,1],{visible:false});
        var t1 = board.create('line', [input[0],i1]);
        var t2 = board.create('line', [input[0],i2]);
      } catch(e) {
        JXG.GeogebraReader.debug("* <b>Err:</b> Tangent " + attr.name +"<br>\n");
        return false;
      }
    break;
    case 'circumcirclearc':
      attr = JXG.GeogebraReader.boardProperties(gxtEl, element, attr);
      attr = JXG.GeogebraReader.colorProperties(element, attr);
      gxtEl = JXG.GeogebraReader.coordinates(gxtEl, element);
      attr = JXG.GeogebraReader.visualProperties(element, attr);

      try {
        JXG.GeogebraReader.debug("* <b>CircumcircleArc:</b> First: " + input[0].name + "<br>\n");
        p = board.create('circumcircle', input, attr);
        return p;
      } catch(e) {
        JXG.GeogebraReader.debug("* <b>Err:</b> CircumcircleArc " + attr.name +"<br>\n");
        return false;
      }
    break;
    case 'circumcirclesector':
      attr = JXG.GeogebraReader.boardProperties(gxtEl, element, attr);
      attr = JXG.GeogebraReader.colorProperties(element, attr);
      gxtEl = JXG.GeogebraReader.coordinates(gxtEl, element);
      attr = JXG.GeogebraReader.visualProperties(element, attr);

      try {
        JXG.GeogebraReader.debug("* <b>CircumcircleSector:</b> First: " + input[0].name + "<br>\n");
        p = board.create('sector', [input[0], input[2], input[1]], attr);
        return p;
      } catch(e) {
        JXG.GeogebraReader.debug("* <b>Err:</b> CircumcircleSector " + attr.name +"<br>\n");
        return false;
      }
    break;
    case 'semicircle':
      attr = JXG.GeogebraReader.boardProperties(gxtEl, element, attr);
      attr = JXG.GeogebraReader.colorProperties(element, attr);
      gxtEl = JXG.GeogebraReader.coordinates(gxtEl, element);
      attr = JXG.GeogebraReader.visualProperties(element, attr);

      try {
        JXG.GeogebraReader.debug("* <b>Semicircle:</b> First: " + input[0].name + "<br>\n");
        m = board.create('midpoint', input, {visible: 'false'});
        p = board.create('sector', [m, input[0], input[1]], attr);
        return p;
      } catch(e) {
        JXG.GeogebraReader.debug("* <b>Err:</b> Semicircle " + attr.name +"<br>\n");
        return false;
      }
    break;
    case 'angle':
      attr = JXG.GeogebraReader.boardProperties(gxtEl, element, attr);
      attr = JXG.GeogebraReader.colorProperties(element, attr);
      gxtEl = JXG.GeogebraReader.coordinates(gxtEl, element);
      attr = JXG.GeogebraReader.visualProperties(element, attr);

      try {
        JXG.GeogebraReader.debug("* <b>Angle:</b> First: " + input[0].name + "<br>\n");
        p = board.create('angle', input, attr);
        return p;
      } catch(e) {
        JXG.GeogebraReader.debug("* <b>Err:</b> Angle " + attr.name +"<br>\n");
        return false;
      }
    break;
    case 'angularbisector':
      attr = JXG.GeogebraReader.boardProperties(gxtEl, element, attr);
      attr = JXG.GeogebraReader.colorProperties(element, attr);
      gxtEl = JXG.GeogebraReader.coordinates(gxtEl, element);
      attr = JXG.GeogebraReader.visualProperties(element, attr);

      try {
        JXG.GeogebraReader.debug("* <b>Angularbisector:</b> First: " + input[0].name + "<br>\n");
        p = board.create('bisector', input, attr);
        return p;
      } catch(e) {
        JXG.GeogebraReader.debug("* <b>Err:</b> Angularbisector " + attr.name +"<br>\n");
        return false;
      }
    break;
    case 'numeric':
      attr = JXG.GeogebraReader.boardProperties(gxtEl, element, attr);
      attr = JXG.GeogebraReader.colorProperties(element, attr);
      // gxtEl = JXG.GeogebraReader.coordinates(gxtEl, element);
      attr = JXG.GeogebraReader.visualProperties(element, attr);

      if(element.getElementsByTagName('slider').length == 1) { // it's a slider
        var sx = parseFloat(element.getElementsByTagName('slider')[0].attributes['x'].value);
        var sy = parseFloat(element.getElementsByTagName('slider')[0].attributes['y'].value);
    var tmp = new JXG.Coords(JXG.COORDS_BY_SCREEN, [sx, sy], board);
    sx = tmp.usrCoords[1];
    sy = tmp.usrCoords[2];
    
        if(element.getElementsByTagName('slider')[0].attributes['horizontal'].value == 'true') {
          var len = parseFloat(element.getElementsByTagName('slider')[0].attributes['width'].value)/(board.unitX*board.zoomX);
          var ex = sx + len;
          var ey = sy;
        } else {
          var len = parseFloat(element.getElementsByTagName('slider')[0].attributes['width'].value)/(board.unitX*board.zoomX);
          var ex = sx;
          var ey = sy + len;
        }

        var sip = parseFloat(element.getElementsByTagName('value')[0].attributes['val'].value);
        var smin = parseFloat(element.getElementsByTagName('slider')[0].attributes['min'].value);
        var smax = parseFloat(element.getElementsByTagName('slider')[0].attributes['max'].value);

        (element.getElementsByTagName('animation')[0]) ? attr.snapWidth = parseFloat(element.getElementsByTagName('animation')[0].attributes['step'].value) : false;

        try {
          JXG.GeogebraReader.debug("* <b>Numeric:</b> First: " + attr.name + "<br>\n");
          n = board.create('slider', [[sx,sy], [ex,ey], [smin, sip, smax]], attr);
          return n;
        } catch(e) {
          JXG.GeogebraReader.debug("* <b>Err:</b> Numeric " + attr.name +"<br>\n");
          return false;
        }
      }
    break;
    case 'midpoint':
      attr = JXG.GeogebraReader.boardProperties(gxtEl, element, attr);
      attr = JXG.GeogebraReader.colorProperties(element, attr);
      gxtEl = JXG.GeogebraReader.coordinates(gxtEl, element);
      attr = JXG.GeogebraReader.visualProperties(element, attr);

      try {
          p = board.create('midpoint', input, attr);
          JXG.GeogebraReader.debug("* <b>Midpoint ("+ p.id +"):</b> "+ attr.name + "("+ gxtEl.x +", "+ gxtEl.y +")<br>\n");
          return p;
      } catch(e) {
          JXG.GeogebraReader.debug("* <b>Err:</b> Midpoint " + attr.name +"<br>\n");
          return false;
      }
    break;
    case 'center':
      attr = JXG.GeogebraReader.boardProperties(gxtEl, element, attr);
      attr = JXG.GeogebraReader.colorProperties(element, attr);
      gxtEl = JXG.GeogebraReader.coordinates(gxtEl, element);
      attr = JXG.GeogebraReader.visualProperties(element, attr);
      try {
          p = board.create('point', [function() {
                                                  return JXG.getReference(board, input[0].id).midpoint.X();
                                        },  function() {
                                                  return JXG.getReference(board, input[0].id).midpoint.Y();
                                        }], attr);
          JXG.GeogebraReader.debug("* <b>Center ("+ p.id +"):</b> "+ attr.name + "("+ gxtEl.x +", "+ gxtEl.y +")<br>\n");
          return p;
      } catch(e) {
          JXG.GeogebraReader.debug("* <b>Err:</b> Center " + attr.name +"<br>\n");
          return false;
      }
    break;
    case 'function':
      // attr = JXG.GeogebraReader.boardProperties(gxtEl, element, attr);
      // attr = JXG.GeogebraReader.colorProperties(element, attr);
      // gxtEl = JXG.GeogebraReader.coordinates(gxtEl, element);
      // attr = JXG.GeogebraReader.visualProperties(element, attr);

      if(JXG.GeogebraReader.getElement(attr.name, true)) {
        var func = JXG.GeogebraReader.getElement(attr.name, true).attributes['exp'].value;
      } else {
        var func = input[0];
      }
      JXG.GeogebraReader.debug('Function: '+ func);

      // interval with right and/or left borders
      if(input && input.length == 3) {
        var interval = input[1] +', '+ input[2];
      } else if(input && input.length == 2) {
        var interval = input[1];
      } else {
        var interval;
      }

      func = JXG.GeogebraReader.functionParse(func);
      var l = func.length - 1;

      // func = JXG.GeogebraReader.ggbParse(board, func);
      func[l] = JXG.GeogebraReader.ggbParse(board, func[l]);

      JXG.GeogebraReader.debug('Function: '+ func);
      // func[l] = "return "+func[l]+";";

      // var f = board.create('functiongraph', [Function('x', 'return Math.sin(x);') , -3, 3]);

      try {
        if (l==1)
          f = board.create('functiongraph', [Function(func[0], func[1])]);
        else if (l==2)
          f = board.create('functiongraph', [Function(func[0], func[1], func[2])]);
        else if (l==3)
          f = board.create('functiongraph', [Function(func[0], func[1], func[2], func[3])]);
        else if (l==4)
          f = board.create('functiongraph', [Function(func[0], func[1], func[2], func[3], func[4])]);

        JXG.GeogebraReader.debug("Functiongraph "+ attr.name +"("+ func[0] +", ...) = "+ func[l] +"<br/>\n");
        return f;
      } catch(e) {
        JXG.GeogebraReader.debug("* <b>Err:</b> Functiongraph " + attr.name +"<br>\n");
        return false;
      }
     break;
     case 'polar':
      attr = JXG.GeogebraReader.boardProperties(gxtEl, element, attr);
      attr = JXG.GeogebraReader.colorProperties(element, attr);
      gxtEl = JXG.GeogebraReader.coordinates(gxtEl, element);
      attr = JXG.GeogebraReader.visualProperties(element, attr);

      try {
        JXG.GeogebraReader.debug("* <b>Polar:</b> First: " + input[0].name + ", Sec.: "+ input[1].name +"<br>\n");
        var m = function(circ) {
          return [[circ.midpoint.X()*circ.midpoint.X()+circ.midpoint.Y()*circ.midpoint.Y()-circ.getRadius()*circ.getRadius(),
                     -circ.midpoint.X(),-circ.midpoint.Y()],
                    [-circ.midpoint.X(),1,0],
                    [-circ.midpoint.Y(),0,1]
                   ];
        };
        var p = board.create('line', [
                    function(){ return JXG.Math.matVecMult(m(input[1]), input[0].coords.usrCoords)[0]; },
                    function(){ return JXG.Math.matVecMult(m(input[1]), input[0].coords.usrCoords)[1]; },
                    function(){ return JXG.Math.matVecMult(m(input[1]), input[0].coords.usrCoords)[2]; }
                ], attr);
        return p;
      } catch(e) {
        JXG.GeogebraReader.debug("* <b>Err:</b> Polar " + attr.name +"<br>\n");
        return false;
      }
    break;
   case 'slope':
     attr = JXG.GeogebraReader.boardProperties(gxtEl, element, attr);
     attr = JXG.GeogebraReader.colorProperties(element, attr);
     gxtEl = JXG.GeogebraReader.coordinates(gxtEl, element);
     attr = JXG.GeogebraReader.visualProperties(element, attr);

     //TODO: Farben anpassen und keine durchgehende Normale
     try {
       JXG.GeogebraReader.debug("* <b>Slope:</b> First: " + input[0].name +"<br>\n");
       var l1 = board.create('segment', [input[0].point1, [(1+input[0].point1.X()), input[0].point1.Y()]], {visible: false});
       var l2 = board.create('normal', [l1, l1.point2], {visible: false});
       var i  = board.create('intersection', [input[0], l2, 0], {visible: false});
       var m  = board.create('midpoint', [l1.point2, i], {visible: false});
       var slope = function() { return i.Y()-l1.point1.Y();};
       var t = board.create('text', [function(){return m.X();}, function(){return m.Y();},
                      function(){ return "m = "+ function(){ return i.Y()-l1.point1.Y();}(); }]);
       return m;
     } catch(e) {
       JXG.GeogebraReader.debug("* <b>Err:</b> Slope " + attr.name +"<br>\n");
       return false;
     }
   break;

// noch zu implementieren: .area() als Flaeche

// case 'transform':
// break;
//    case 'radius':
//    break;
//    case 'derivative':
//    break;
//    case 'root':
//    break;
//    case 'corner':
//    break;
//    case 'ellipse':
//    break;
//    case 'integral':
//    break;
//    case 'unitvector':
//    break;
//    case 'extremum':
//    break;
//    case 'turningpoint':
//    break;
//    case 'arc':
//    break;
//    case 'circlepart':
//    break;
//    case 'uppersum':
//    break;
//    case 'lowersum':
//    break;
//    case 'image':
//    break;
//    case 'text':
//    break;
    default:
      return false;
    break;
  }
};

/**
 * Reading the elements of a geogebra file
 * @param {Object} board board object
 */
this.readGeogebra = function(tree, board) {
  var el, Data, i;
  var els = [];

  board.ggbElements = [];
  JXG.GeogebraReader.tree = tree;
  JXG.GeogebraReader.board = board;
  JXG.GeogebraReader.format = parseFloat(JXG.GeogebraReader.tree.getElementsByTagName('geogebra')[0].attributes['format'].value);

  JXG.GeogebraReader.writeBoard(board);

  var constructions = JXG.GeogebraReader.tree.getElementsByTagName("construction");
  for (var t=0; t<constructions.length; t++) {

    var cmds = constructions[t].getElementsByTagName("command");
    for (var s=0; s<cmds.length; s++) {
      Data = cmds[s];

      var input = [];
      for (i=0; i<Data.getElementsByTagName("input")[0].attributes.length; i++) {
        el = Data.getElementsByTagName("input")[0].attributes[i].value;
        if(el.match(/°/) || !el.match(/\D/) || el.match(/Circle/) || Data.attributes['name'].value == 'Function') {
          input[i] = el;
        } else {
          if(typeof board.ggbElements[el] == 'undefined' || board.ggbElements[el] == '') {
            var elnode = JXG.GeogebraReader.getElement(el);
            board.ggbElements[el] = JXG.GeogebraReader.writeElement(board, elnode);
            JXG.GeogebraReader.debug("regged: "+ board.ggbElements[el] +"<br/>");
          }
          input[i] = board.ggbElements[el];
        }
      };

      var output = [], elname = Data.getElementsByTagName("output")[0].attributes[0].value;
      for (i=0; i<Data.getElementsByTagName("output")[0].attributes.length; i++) {
        el = Data.getElementsByTagName("output")[0].attributes[i].value;
        output[i] = JXG.GeogebraReader.getElement(el);
      };
      if(typeof board.ggbElements[elname] == 'undefined' || board.ggbElements[elname] == '') {
        board.ggbElements[elname] = JXG.GeogebraReader.writeElement(board, output, input, Data.attributes['name'].value.toLowerCase());
        JXG.GeogebraReader.debug("regged: "+board.ggbElements[elname].id+"<br/>");

        /* register borders to according "parent" */
        if(board.ggbElements[elname].borders)
          for(var i=0; i<board.ggbElements[elname].borders.length; i++) {
            board.ggbElements[board.ggbElements[elname].borders[i].name] = board.ggbElements[elname].borders[i];
            JXG.GeogebraReader.debug(i+") regged: "+board.ggbElements[elname].borders[i].name+"("+ board.ggbElements[board.ggbElements[elname].borders[i].name].id +")<br/>");
          };
      }

    };

    // create "single" elements which do not depend on any other
    var elements = constructions[t].getElementsByTagName("element");
    for (var s=0; s<elements.length; s++) {
      var Data = elements[s];
      var el = Data.attributes['label'].value;

      if(typeof board.ggbElements[el] == 'undefined' || board.ggbElements[el] == '') {
        JXG.GeogebraReader.debug("Betrachte Rest: "+ el);
        board.ggbElements[el] = JXG.GeogebraReader.writeElement(board, Data);

        if(expr = JXG.GeogebraReader.getElement(el, true)) {
          var type = Data.attributes['type'].value;
          switch(type) {
            case 'text':
            case 'function':
              // board.ggbElements[el] = JXG.GeogebraReader.writeElement(board.ggbElements, board, expr, false, type);
            break;
            default:
              JXG.GeogebraReader.ggbParse(board, expr.attributes['exp'].value, el);
            break;
          }
        }

      }
    };

  }; // end: for construction
  board.fullUpdate();
  delete(board.ggbElements);
};

/**
 * Decoding string into utf-8
 * @param {String} string to decode
 * @return {String} utf8 decoded string
 */
this.utf8 = function (utftext) {
  var string = [];
  var i = 0;
  var c = c1 = c2 = 0;

  while ( i < utftext.length ) {
    c = utftext.charCodeAt(i);

    if (c < 128) {
      string.push(String.fromCharCode(c));
      i++;
    } else if((c > 191) && (c < 224)) {
      c2 = utftext.charCodeAt(i+1);
      string.push(String.fromCharCode(((c & 31) << 6) | (c2 & 63)));
      i += 2;
    } else {
      c2 = utftext.charCodeAt(i+1);
      c3 = utftext.charCodeAt(i+2);
      string.push(String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63)));
      i += 3;
    }
  };
  return string.join('');
};

/**
 * Extracting the packed geogebra file in order to return the "blank" xml-tree for further parsing.
 * @param {String} archive containing geogebra.xml-file or raw input string (eg. xml-tree)
 * @return {String} content of geogebra.xml-file if archive was passed in
 */
this.prepareString = function(fileStr) {
  if (fileStr.indexOf('<') != 0) {
    bA = [];
    for (i=0;i<fileStr.length;i++)
      bA[i]=JXG.Util.asciiCharCodeAt(fileStr,i);
    // Unzip
    fileStr = (new JXG.Util.Unzip(bA)).unzipFile("geogebra.xml");
  }
  fileStr = JXG.GeogebraReader.utf8(fileStr);
  return fileStr;
};
}; // end: GeogebraReader()