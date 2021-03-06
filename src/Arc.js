/*
    Copyright 2008-2010
        Matthias Ehmann,
        Michael Gerhaeuser,
        Carsten Miller,
        Bianca Valentin,
        Alfred Wassermann,
        Peter Wilfahrt

    This file is part of JSXGraph.

    JSXGraph is free software: you can redistribute it and/or modify
    it under the terms of the GNU Lesser General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    JSXGraph is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Lesser General Public License for more details.

    You should have received a copy of the GNU Lesser General Public License
    along with JSXGraph.  If not, see <http://www.gnu.org/licenses/>.
*/

/** 
 * @fileoverview In this file the geometry object Arc is defined. Arc stores all
 * style and functional properties that are required to draw an arc on a board.
 */

/**
 * @class This element is used to provide a constructor for arc elements.
 * @pseudo
 * @description An is a segment of the circumference of a circle.
 * @name Arc
 * @augments Curve
 * @constructor
 * @type JXG.Curve
 * @throws {Exception} If the element cannot be constructed with the given parent objects an exception is thrown.
 * @param {JXG.Point_JXG.Point_JXG.Point} p1,p2,p3 The result will be an arc of a circle around p1 through p2. The arc is drawn
 * counter-clockwise from p2 to p3.
 * @example
 * // Create an arc out of three free points
 * var p1 = board.create('point', [2.0, 2.0]);
 * var p2 = board.create('point', [1.0, 0.5]);
 * var p3 = board.create('point', [3.5, 1.0]);
 *
 * var a = board.create('arc', [p1, p2, p3]);
 * </pre><div id="114ef584-4a5e-4686-8392-c97501befb5b" style="width: 300px; height: 300px;"></div>
 * <script type="text/javascript">
 *   var arex1_board = JXG.JSXGraph.initBoard('114ef584-4a5e-4686-8392-c97501befb5b', {boundingbox: [-1, 7, 7, -1], axis: true, showcopyright: false, shownavigation: false});
 * var arex1_p1 = arex1_board.create('point', [2.0, 2.0]);
 * var arex1_p2 = arex1_board.create('point', [1.0, 0.5]);
 * var arex1_p3 = arex1_board.create('point', [3.5, 1.0]);
 *
 * var arex1_a = arex1_board.create('arc', [arex1_p1, arex1_p2, arex1_p3]);
 * </script><pre>
 */
JXG.createArc = function(board, parents, attributes) {
    var el, defaults, key, options;
        
    // Alles 3 Punkte?
    if ( !(JXG.isPoint(parents[0]) && JXG.isPoint(parents[1]) && JXG.isPoint(parents[2]))) {
        throw new Error("JSXGraph: Can't create Arc with parent types '" + 
                        (typeof parents[0]) + "' and '" + (typeof parents[1]) + "' and '" + 
                        (typeof parents[2]) + "'." +
                        "\nPossible parent types: [point,point,point]");
    }

    // Read the default values from Options and use them in case they are not set by the user
    // in attributes
    defaults = {withLabel:JXG.readOption(board.options,'elements','withLabel'), 
                layer:JXG.readOption(board.options,'layer','arc'),
                useDirection:false}; // useDirection is necessary for circumCircleArcs
    defaults['strokeWidth'] =  board.options.elements['strokeWidth'];
    options = board.options.arc;
    for (key in options) {
        defaults[key] = options[key];
    }
    attributes = JXG.checkAttributes(attributes, defaults);
        
    el = board.create('curve',[[0],[0]],attributes);
    el.type = JXG.OBJECT_TYPE_ARC;
    /**
     * Midpoint of the arc.
     * @type JXG.Point
     */
    el.midpoint = JXG.getReference(board, parents[0]);
    /**
     * Point defining the arcs circle.
     * @type JXG.Point
     */
    el.point2 = JXG.getReference(board, parents[1]);
    /**
     * The point defining the angle of the arc.
     * @type JXG.Point
     */
    el.point3 = JXG.getReference(board, parents[2]);
    /* Add arc as child to defining points */
    el.midpoint.addChild(el);
    el.point2.addChild(el);
    el.point3.addChild(el);
    
    el.useDirection = attributes['useDirection'];      // useDirection is necessary for circumCircleArcs

    el.updateDataArray = function() {
        var A = this.point2,
            B = this.midpoint,
            C = this.point3,
            beta, co, si, matrix,
            phi = JXG.Math.Geometry.rad(A,B,C),
            i,
            //n = 100, 
            n = Math.ceil(phi/Math.PI*90)+1,
            delta = phi/n, //Math.PI/90.0,
            x = B.X(),
            y = B.Y(),
            v,
            det, p0c, p1c, p2c;

        if (this.useDirection) {  // This is true for circumCircleArcs. In that case there is
                                  // a fourth parent element: [midpoint, point1, point3, point2]
            p0c = parents[1].coords.usrCoords;
            p1c = parents[3].coords.usrCoords;
            p2c = parents[2].coords.usrCoords;
            det = (p0c[1]-p2c[1])*(p0c[2]-p1c[2]) - (p0c[2]-p2c[2])*(p0c[1]-p1c[1]);
            if(det < 0) {
                this.point2 = parents[1];
                this.point3 = parents[2];
            } else {
                this.point2 = parents[2];
                this.point3 = parents[1];
            }
        }
        this.dataX = [A.X()];
        this.dataY = [A.Y()];

        for (beta=delta,i=1; i<=n; i++, beta+=delta) {
            co = Math.cos(beta);
            si = Math.sin(beta);
            matrix = [[1,            0,   0],
                      [x*(1-co)+y*si,co,-si],
                      [y*(1-co)-x*si,si, co]];
            v = JXG.Math.matVecMult(matrix,A.coords.usrCoords);
            this.dataX.push(v[1]/v[0]);
            this.dataY.push(v[2]/v[0]);
        }
    };

    /**
     * Calculates the arcs radius.
     * @returns {Number} The arcs radius
     */
    el.Radius = function() {
        return this.point2.Dist(this.midpoint);
    };

    /**
     * @deprecated
     */
    el.getRadius = function() {
        return this.Radius();
    };

    /**
     *Checks whether (x,y) is near the arc.
     * @param {int} x Coordinate in x direction, screen coordinates.
     * @param {int} y Coordinate in y direction, screen coordinates.
     * @returns {Boolean} True if (x,y) is near the arc, False otherwise.
     */
    el.hasPoint = function (x, y) { 
        var prec = this.board.options.precision.hasPoint/(this.board.stretchX),
            checkPoint = new JXG.Coords(JXG.COORDS_BY_SCREEN, [x,y], this.board),
            r = this.Radius(),
            dist = this.midpoint.coords.distance(JXG.COORDS_BY_USER,checkPoint),
            has = (Math.abs(dist-r) < prec),
            angle;
            
        if(has) {
            angle = JXG.Math.Geometry.rad(this.point2,this.midpoint,checkPoint.usrCoords.slice(1));
            if (angle>JXG.Math.Geometry.rad(this.point2,this.midpoint,this.point3)) { has = false; }
        }
        return has;    
    };

    /**
     * Checks whether (x,y) is within the sector defined by the arc.
     * @param {int} x Coordinate in x direction, screen coordinates.
     * @param {int} y Coordinate in y direction, screen coordinates.
     * @returns {Boolean} True if (x,y) is within the sector defined by the arc, False otherwise.
     */
    el.hasPointSector = function (x, y) { 
        var checkPoint = new JXG.Coords(JXG.COORDS_BY_SCREEN, [x,y], this.board),
            r = this.Radius(),
            dist = this.midpoint.coords.distance(JXG.COORDS_BY_USER,checkPoint),
            has = (dist<r),
            angle;
        
        if(has) {
            angle = JXG.Math.Geometry.rad(this.point2,this.midpoint,checkPoint.usrCoords.slice(1));
            if (angle>JXG.Math.Geometry.rad(this.point2,this.midpoint,this.point3)) { has = false; }
        }
        return has;    
    };

    /**
     * @returns {JXG.Coords} Coordinates of the text's anchor.
     */
    el.getTextAnchor = function() {
        return this.midpoint.coords;
    };

    /**
     * @returns {JXG.Coords} Coordinates of the label's anchor
     */
    el.getLabelAnchor = function() {
        var angle = JXG.Math.Geometry.rad(this.point2, this.midpoint, this.point3),
            dx = 10/(this.board.stretchX),
            dy = 10/(this.board.stretchY),
            p2c = this.point2.coords.usrCoords,
            pmc = this.midpoint.coords.usrCoords,
            bxminusax = p2c[1] - pmc[1],
            byminusay = p2c[2] - pmc[2],
            coords, vecx, vecy, len;

        if(this.label.content != null) {                          
            this.label.content.relativeCoords = new JXG.Coords(JXG.COORDS_BY_SCREEN, [0,0],this.board);                      
        }  

        coords = new JXG.Coords(JXG.COORDS_BY_USER, 
                        [pmc[1]+ Math.cos(angle*0.5)*bxminusax - Math.sin(angle*0.5)*byminusay, 
                        pmc[2]+ Math.sin(angle*0.5)*bxminusax + Math.cos(angle*0.5)*byminusay], 
                        this.board);

        vecx = coords.usrCoords[1] - pmc[1];
        vecy = coords.usrCoords[2] - pmc[2];
    
        len = Math.sqrt(vecx*vecx+vecy*vecy);
        vecx = vecx*(len+dx)/len;
        vecy = vecy*(len+dy)/len;

        return new JXG.Coords(JXG.COORDS_BY_USER, [pmc[1]+vecx,pmc[2]+vecy],this.board);
    };

    el.prepareUpdate().update();
    return el;
};

JXG.JSXGraph.registerElement('arc', JXG.createArc);

/** TODO: Documentation of those two elements below are to be written like the one above for ARC.
/**
 * Creates a new semicircle. The semicircle is drawn clock-wise between the first and the second defining point.
 * @param {JXG.Board} board The board the semicircle is put on.
 * @param {Array} parents Array of two opposite points defining the semicircle.
 * @param {Object} attributes Object containing properties for the element such as stroke-color and visibility. See @see JXG.GeometryElement#setProperty
 * @type JXG.Arc
 * @return Reference to the created arc object.
 */
JXG.createSemicircle = function(board, parents, attributes) {
    var el, mp, idmp = '';
    
    attributes = JXG.checkAttributes(attributes,{});
    if(attributes['id'] != null) {
        idmp = attributes['id']+'_mp';
    }
    // Alles 2 Punkte?
    if ( (JXG.isPoint(parents[0])) && (JXG.isPoint(parents[1])) ) {
        mp = board.create('midpoint', [parents[0], parents[1]], {id:idmp, withLabel:false, visible:false});
        el = board.create('arc',[mp, parents[1], parents[0]],attributes);
    } // Ansonsten eine fette Exception um die Ohren hauen
    else
        throw new Error("JSXGraph: Can't create Semicircle with parent types '" + 
                        (typeof parents[0]) + "' and '" + (typeof parents[1]) + "'." +
                        "\nPossible parent types: [point,point]");

    return el;
};

JXG.JSXGraph.registerElement('semicircle', JXG.createSemicircle);

/**
 * Creates a new circumcircle arc through three defining points.
 * @param {JXG.Board} board The board the arc is put on.
 * @param {Array} parents Array of three points defining the circumcircle arc.
 * @param {Object} attributes Object containing properties for the element such as stroke-color and visibility. See @see JXG.GeometryElement#setProperty
 * @type JXG.Arc
 * @return Reference to the created arc object.
 */
JXG.createCircumcircleArc = function(board, parents, attributes) {
    var el, mp, idmp;
    
    attributes = JXG.checkAttributes(attributes,{withLabel:JXG.readOption(board.options,'arc','withLabel'), layer:null});
    if(attributes['id'] != null) {
        idmp = attributes['id']+'_mp';
    }
    
    // Alles 3 Punkte?
    if ( (JXG.isPoint(parents[0])) && (JXG.isPoint(parents[1])) && (JXG.isPoint(parents[2]))) {
        mp = board.create('circumcirclemidpoint',[parents[0], parents[1], parents[2]], {id:idmp, withLabel:false, visible:false});
        attributes.useDirection = true;
        el = board.create('arc', [mp,parents[0],parents[2],parents[1]], attributes);
    } // Ansonsten eine fette Exception um die Ohren hauen
    else
        throw new Error("JSXGraph: create Circumcircle Arc with parent types '" + 
                        (typeof parents[0]) + "' and '" + (typeof parents[1]) + "' and '" + (typeof parents[2]) + "'." +
                        "\nPossible parent types: [point,point,point]");


    return el;
};

JXG.JSXGraph.registerElement('circumcirclearc', JXG.createCircumcircleArc);
