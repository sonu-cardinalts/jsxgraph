#!/usr/bin/env python

import numpy
import os

os.environ['MPLCONFIGDIR'] = '/tmp'

import matplotlib
matplotlib.use('Agg')
from matplotlib.pyplot import *
from matplotlib.contour import *

import re
import zlib
import base64
import cStringIO
import cgi

print """\
Content-Type: text/html\n
"""

# Data required by this script:
#
# * Number of independent and dependent variables. Number of trace variables is always 2
# * Polynomials generating the ideal
# * Values of the independent variables
# * part of board displayed on screen

# Get Data from post/get parameters
form = cgi.FieldStorage();

number = form.getfirst('number', 'empty')
polys = form.getfirst('polynomials', 'empty')

# Clean them up
number = cgi.escape(number)
polys = base64.b64decode(cgi.escape(polys))

debug = False;

input = ""

# Variable code begins here
# Here indeterminates of polynomial ring have to be adjusted
input += "Use R ::= QQ[u[1..%s],x,y];" % number
# Of course the polynomials generating the ideal must be adjusted
input += "I := Ideal(%s);" % polys
# So have to be the indeterminates to be eliminated
input += "J := Elim(u[1]..u[%s], I);" % number
# and ends here

# Fixed code which hasn't to be adjusted on each run of this script
input += "G := ReducedGBasis(J);"
input += "Print \\\"resultsbegin\\\", NewLine;"
input += "For N := 1 To Len(G) Do\\n"
input += "    B := Factor(G[N]);\\n"
input += "    For M := 1 To Len(B) Do\\n"
input += "        StarPrintFold(B[M][1], -1);"
input += "        Print NewLine;"
input += "    EndFor;\\n"
input += "EndFor;\\n"
input += "Print \\\"resultsend\\\", NewLine;"

if debug:
    print "Starting CoCoA with input<br />"
    print input + '<br />'

cocoa = os.popen("echo \"" + input + "\" | cocoa")

output = cocoa.read()

if debug:
    print "Reading and Parsing CoCoA output" + '<br />'
    print output + '<br />'

# Extract results
result = re.split('resultsend', re.split('resultsbegin', output)[1])[0]
result = re.split('-------------------------------', re.split('-------------------------------', result)[1])[0]
result = result.replace("^", "**")
polynomials = re.split('\n', result)

if debug:
    print "Found the following polynomials:" + '<br />'
    for i in range(0,len(polynomials)):
        print "Polynomial ", i+1, ": " + polynomials[i] + '<br />'

for i in range(0,len(polynomials)):
    if len(polynomials[i]) == 0:
        continue
    if (not "x" in polynomials[i]) and (not "y" in polynomials[i]):
        continue

    x, y = numpy.meshgrid(numpy.linspace(-20, 20, 600), numpy.linspace(-20, 20, 600))

    z = eval(polynomials[i])
    C = contour(x, y, z, [0])

    if debug:
        savefig('/tmp/test.png')

    con = C.find_nearest_contour(0, 0)

    pa = C.collections[0].get_paths()[0].to_polygons()[0]

    data = cStringIO.StringIO()

    for i in range(0,len(pa)):
        print >>data, pa[i,0], ",", pa[i,1], ";"

    enc_data = base64.b64encode(zlib.compress(data.getvalue(), 9))

    if debug:
        print data.getvalue() + '<br />'

    print enc_data

    data.close()