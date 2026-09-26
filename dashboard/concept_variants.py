"""Distinct conceptual prompts for independent checks after guided practice."""
DATA={
'angles':[
('Two angles are supplementary. What equation connects them?','Their sum is 180°','Their sum is 90°','They must be equal','Supplementary angles together form a straight turn.'),
('Why are vertical opposite angles equal?','Each supplements the same neighboring angle','Every intersecting angle is 90°','The lines must be parallel','Subtracting the same neighboring angle from 180° gives equal results.'),
('A right angle is divided into two parts. What stays fixed?','The two parts sum to 90°','Both parts are 45°','Their difference is 90°','A right angle is a quarter turn regardless of how it is divided.'),
('An angle has longer arms in a new drawing but the same opening. Its measure is…','Unchanged','Larger','Smaller','Angle measures the turn, not the lengths of the rays.')],
'triangles':[
('Which side belongs alone on the right in a²+b²=c²?','The hypotenuse','The shortest side','Any chosen side','The hypotenuse is opposite the right angle.'),
('Lengths 3, 5, and 8 lie exactly end to end. Do they make a nondegenerate triangle?','No: the sum must be strictly greater','Yes: equality is enough','Only if the longest side is horizontal','Equality gives a flat figure with no area.'),
('Can Pythagoras be used on any triangle just because it has three sides?','No: it requires a right triangle','Yes: every triangle satisfies it','Only if all lengths are whole numbers','The right-angle condition is essential.'),
('A triangle has one obtuse angle. What must be true of its other two angles?','Both are acute','One is also obtuse','Both are right angles','The total is 180°, leaving less than 90° for the two remaining angles together.')],
'congruence':[
('Triangle UVW is congruent to triangle XYZ. Which angle matches W?','Z','X','Y','Correspondence follows the order U↔X, V↔Y, W↔Z.'),
('Reflecting a triangle changes which property?','Orientation may change, while lengths stay fixed','Every side becomes longer','Its area must double','Reflection is a rigid motion.'),
('Three corresponding side lengths match. Which criterion proves congruence?','SSS','AAA','AA','Three side lengths determine a triangle up to rigid motion.'),
('Two angles and the side between them match. Which criterion applies?','ASA','SSA','AAA','The side lies between the two matched angles.'),
('Two matched sides and a nonincluded angle are given. Is SAS established?','No: the angle must be between the sides','Yes: any angle works','Only if the sides have integer lengths','SAS specifically uses the included angle.'),
('One triangle is doubled in every length. What is generally true?','It is similar but not congruent to the original','It is congruent to the original','Its angles double','Dilation preserves shape but changes size.')],
'similarity':[
('Two triangles have two matching pairs of angles. Which conclusion follows?','They are similar','Their perimeters are equal','They must be congruent','The third angle also matches, establishing AA similarity.'),
('A dilation shrinks all lengths by 1/2. What happens to area?','It becomes 1/4 as large','It becomes 1/2 as large','It becomes 1/8 as large','Area uses two length dimensions: (1/2)².'),
('How should corresponding-side ratios be formed?','Keep the same direction from one figure to the other','Reverse each second ratio','Use whichever lengths look closest','A consistent image/original direction gives the common scale factor.'),
('A scale factor is 1. Which relationship is possible?','Congruence as a special case of similarity','Every angle becomes zero','Area doubles','All corresponding lengths remain unchanged.')],
'circles':[
('A central angle is 180°. Its sector is what fraction of the disk?','One half','One quarter','The entire disk','180/360 is one half.'),
('What is a circle’s diameter in terms of radius?','2r','r²','r/2','A diameter passes through the center and spans two radii.'),
('Radius triples. The full circumference becomes…','3 times as large','9 times as large','27 times as large','Circumference is linear in radius: C=2πr.'),
('Radius triples. The disk area becomes…','9 times as large','3 times as large','6 times as large','Area is πr², so scaling uses 3².')],
'area':[
('Two copies of a triangle form a parallelogram. One triangle has…','Half the parallelogram’s area','The same area','Twice the area','The two congruent copies partition the parallelogram.'),
('Sliding the top of a parallelogram sideways with fixed base and height does what to area?','Leaves it unchanged','Always increases it','Always decreases it','Area depends on base and perpendicular height, not the shear.'),
('Why does the trapezoid formula use (a+b)/2?','It averages the two parallel side lengths','It averages all four sides','It averages the diagonals','Two copies form a parallelogram with base a+b.'),
('A triangle is rotated without resizing. Its area…','Stays the same','Depends on how horizontal it looks','Doubles','A rigid motion preserves area.')],
'volume':[
('Which quantity measures the capacity inside a closed box?','Volume','Surface area','Perimeter','Capacity concerns the three-dimensional interior.'),
('A prism’s base area stays fixed and its height doubles. Its volume…','Doubles','Quadruples','Stays fixed','V=Bh is linear in height for a fixed base.'),
('What units belong to surface area?','Square units','Cubic units','Length units','Surface area measures two-dimensional boundary faces.'),
('A cylinder’s radius doubles but its height stays fixed. Its volume…','Quadruples','Doubles','Increases by 8 times','Base area scales with r², while height is unchanged.')],
'coordinate-geometry':[
('Why do negative coordinate differences not create a negative distance?','The differences are squared before taking the positive root','Negative values are simply deleted','Distance equals slope','The distance formula adds squares and takes the nonnegative root.'),
('A midpoint calculation should average…','The two x-values and the two y-values separately','x with y at each point','All four coordinates into one number','Each coordinate represents its own independent axis.'),
('Two nonvertical lines have equal slopes and different intercepts. They are…','Parallel','Perpendicular','The same line','Equal slopes give the same direction; different intercepts separate the lines.'),
('A horizontal line has which slope?','Zero','Undefined','One','Vertical change is zero and horizontal change is nonzero.')],
'proof':[
('A diagram looks symmetric but has no equality markings. Can equal sides be assumed?','No: a given or deduction is needed','Yes: a picture is a proof','Only if the drawing is large','A diagram can be suggestive without being drawn to scale.'),
('M is the midpoint of segment PQ. Which equality follows?','PM=MQ','PM=PQ','PQ=MQ','The midpoint divides a segment into equal pieces.'),
('A universal claim is checked on 100 examples. Is it thereby proved?','No: a general argument is still needed','Yes: 100 is enough','Only if every example is drawn','Finite examples alone do not cover every allowed case.'),
('What must a proof make clear at each step?','Which reason permits the conclusion','How convincing the drawing looks','How many examples were tried','A proof connects justified deductions from the assumptions.'),
('Two equal adjacent angles form a straight angle. What follows?','Each is 90°','Each is 180°','Their common side has length 90','If 2x=180°, then x=90°.'),
('A rhombus with angles 60° and 120° disproves which claim?','Every rhombus is a square','Every square is a rhombus','Every rhombus has four equal sides','It has four equal sides but lacks the right angles required for a square.')],
'center':[
('Before finding a median, what should you do?','Sort the data','Square every value','Remove all duplicates','The median is the middle of the ordered observations.'),
('For an even number of ordered observations, the median is…','The average of the two middle values','The larger middle value','The most frequent value','The usual numeric median splits the ordered data at the two middle positions.'),
('What does the mode identify?','A most frequent value','The sum divided by the count','The largest observation','Frequency, not magnitude, determines the mode.'),
('Why is the mean described as a fair share?','Redistributing the total equally gives the mean','Every value must equal the mean','It always equals the most common value','Mean equals total divided by number of observations.')],
'variance':[
('When the listed values are the entire population, divide the squared deviations by…','N','N−1','The largest value','Population variance averages the N squared deviations.'),
('A sample variance estimates population spread from a fitted sample mean. Its usual denominator is…','n−1','n+1','The mean','The conventional sample estimator uses n−1.'),
('If every observation is equal, variance is…','Zero','One','Undefined in every case','Every deviation from the common mean is zero.'),
('If observations are measured in meters, variance uses…','Square meters','Meters','Cubic meters','Variance averages squared deviations, so its units are squared.')],
'standard-deviation':[
('Adding the same constant to every observation makes standard deviation…','Unchanged','Larger by that constant','Zero','All deviations from the shifted mean stay the same.'),
('Why take the square root of variance?','To return to the original data units','To remove the mean','To make the distribution normal','The square root undoes the squared units.'),
('Does standard deviation describe the entire distribution?','No: different shapes can have the same spread','Yes: it gives every observation','Only when it is positive','Center, shape, and unusual observations still matter.'),
('Multiplying every observation by −1 makes standard deviation…','Unchanged','Negative','Zero','The distances from the mean retain their magnitudes.')],
'distributions':[
('A long tail extends toward smaller values. What is the skew?','Left skew','Right skew','Necessarily symmetric','Skew is named for the tail direction.'),
('A histogram bin [5,10) has count 4. Which statement is justified?','Four values are at least 5 and below 10','All four equal 7.5','Four values are above 10','A bin records interval membership, not exact values.'),
('Relative frequencies over all nonoverlapping bins should add to…','1','The largest frequency','The mean','The bins partition the observations; their fractions sum to the whole.'),
('Can two data sets share a mean but have different spreads?','Yes','No','Only if one has no observations','For example, 2,2,2 and 0,2,4 share a mean but differ in spread.')],
'correlation':[
('What does the sign of a correlation coefficient tell you?','The direction of linear association','Whether the relationship is good or bad','Whether x causes y','A positive or negative sign describes direction, not causality or value judgments.'),
('Why inspect a scatterplot in addition to r?','It can reveal outliers and curved patterns','It guarantees causality','It eliminates every sampling error','One summary can hide structure that the plot reveals.'),
('The valid range of Pearson correlation is…','−1 to 1','0 to infinity','−100 to 100','Correlation is a standardized coefficient bounded between −1 and 1.'),
('As x increases, y tends to decrease along a line. The correlation is likely…','Negative','Positive','Exactly zero','The negative sign describes opposing directions.'),
('Can one distant outlier substantially affect correlation?','Yes','No','Only if both coordinates are negative','Correlation can be sensitive to unusual points.'),
('Children’s shoe size and reading skill rise together. A plausible common influence is…','Age','Shoe color','The correlation coefficient itself','Age or development can influence both measured quantities.')],
'probability':[
('Without replacement, why does the second denominator decrease by one?','One ball has been removed','The colors become equally likely','Every favorable count increases','The population of available balls is smaller.'),
('Which event contains HH, HT, and TH for two coin tosses?','At least one head','Exactly one head','No heads','At least one includes the two-head outcome.'),
('When may disjoint event probabilities be added without subtracting overlap?','When the events cannot both occur','Whenever the events share an outcome','Only if both probabilities are 1/2','Disjoint alternatives have no overlap to double-count.'),
('For events A and B that overlap, why subtract P(A∩B) in the union formula?','The overlap was counted twice','Overlapping events are impossible','Every probability must become smaller','P(A)+P(B) includes the shared outcomes in both terms.')],
'quadratics':[
('A quadratic has discriminant zero. How many distinct real roots does it have?','One','Two','None','The two branches of the quadratic formula coincide.'),
('When solving (x−h)²=d for positive d, why use both signs of √d?','Both positive and negative numbers square to d','Only the positive root can work','A parabola is always above the axis','Both x−h=√d and x−h=−√d must be considered.'),
('Completing the square adds a term inside an expression. What must also happen to preserve its value?','Subtract the same added term','Delete the linear term','Double the entire expression','Adding and subtracting the same amount preserves equality.'),
('What is special about the vertex of a nonconstant parabola?','It is the turning point','It must be a zero','It must lie at the origin','The direction of change reverses at the vertex.')],
'polynomials':[
('An even-multiplicity real zero typically has which sign behavior?','The sign is the same on both sides','The sign changes','The function is undefined there','An even power of the local factor is nonnegative on either side.'),
('A positive leading coefficient and odd degree give which end behavior?','Left down, right up','Both ends up','Left up, right down','The odd leading power has opposite signs on the two ends.'),
('A polynomial’s degree is…','Its largest exponent with nonzero coefficient','The sum of its coefficients','Its number of displayed terms','Only nonzero terms count when identifying the highest power.'),
('A factor (x+6) gives which zero?','−6','6','0','Set the factor equal to zero: x+6=0.')],
'rational-functions':[
('An uncanceled denominator factor can create which graph feature?','A vertical asymptote','A restored domain value','A guaranteed x-intercept','Outputs may grow unbounded near an uncanceled zero of the denominator.'),
('What distinguishes a hole from a filled point?','The original function has no value at that input','Its output must be zero','Its input must be zero','A removable discontinuity remains excluded from the original domain.'),
('When clearing denominators to solve, which information must be retained?','The original excluded inputs','Only the numerator’s degree','Only positive candidate values','Multiplication must not silently admit an input where the original equation is undefined.'),
('What is the horizontal asymptote of 3/(x−2)?','y=0','x=2','y=3','The quotient tends toward zero at large input magnitude.')],
'radicals':[
('Which statement distinguishes √25 from solving x²=25?','√25=5, while the equation has two roots','Both ask for only −5','Both ask for only 5','The radical denotes the principal root; the equation asks for every solution.'),
('For a real square root √(x−4), the input must satisfy…','x≥4','x>0','x≠4','The radicand must be nonnegative, including zero.'),
('Why can squaring lose information?','Opposite signs have the same square','Squares are always negative','Squaring is undefined for negative numbers','A squared equality can hold even if the original signs differed.'),
('A valid step in simplifying √48 is…','√(16×3)=4√3','√(16+32)=4+√32','√48=24','Square roots split across products of nonnegative factors, not sums.')],
'complex-numbers':[
('Which value equals i²?','−1','1','i','The imaginary unit is defined by i²=−1.'),
('Adding complex numbers in the plane is done by…','Adding real parts and imaginary parts separately','Multiplying both coordinates','Discarding imaginary parts','Complex addition is componentwise vector addition.'),
('Multiplication by i makes which rotation?','90° counterclockwise','90° clockwise','180°','The sequence 1, i, −1, −i traces successive counterclockwise quarter turns.'),
('What is i⁴?','1','−1','i','Four quarter turns return to the starting point.')],
'exponentials':[
('A factor of 1.08 means which change per step?','8% growth','108% growth','8% decay','The increase is the factor minus 1.'),
('A positive exponential decay factor must lie…','Between 0 and 1','Above 1','Below 0','A factor in (0,1) repeatedly shrinks a positive amount.'),
('In y=abᵗ, what is y when t=0?','a','b','0','b⁰=1, so the initial output is a.'),
('Why must rate and exponent time units agree?','The factor applies once per specified time step','Different units always cancel automatically','Only annual models work','Using a monthly factor with a yearly step count miscounts the multiplications.')],
'logarithms':[
('What question does log₂8 ask?','Which power of 2 equals 8?','What is 2 divided by 8?','What is 8 squared?','A logarithm returns an exponent.'),
('For real logarithms, the argument must be…','Positive','Nonnegative including zero','Any real number','Real exponentials with a valid positive base have positive outputs.'),
('A valid real logarithm base is…','Positive and not equal to 1','Any number except 0','Any negative number','Base 1 cannot give an invertible exponential, and negative bases do not define real powers generally.'),
('Which expression solves 5ˣ=11?','ln(11)/ln(5)','ln(5)/ln(11)','ln(11−5)','Taking logs gives x ln(5)=ln(11).')],
'sequences':[
('With the first term indexed by 1, how many steps reach term n?','n−1','n','n+1','Index 1 requires zero steps from the initial term.'),
('An arithmetic sequence is identified by a constant…','Difference','Ratio','Square root','Each new term adds the same difference.'),
('A geometric sequence is identified by a constant…','Ratio','Difference','Sum','Successive terms multiply by the same ratio.'),
('An explicit formula is useful because it gives…','A term directly from its index','Only the next term after one already known','Only the sum of all terms','The index can be substituted without first computing every preceding term.')],
'series':[
('How does a series differ from a sequence?','A series adds sequence terms','A series must contain only positive values','A sequence has no order','A sequence lists terms; a series forms their sum.'),
('What is a partial sum Sₙ?','The sum of the first n terms','Only the nth term','The ratio of adjacent terms','A partial sum accumulates a finite initial segment.'),
('Can the infinite geometric-sum formula be used when r=2 and a≠0?','No','Yes','Only if a is an integer','The terms do not tend to zero, and the partial sums do not converge.'),
('Why pair the first and last terms in an arithmetic sum?','Every such pair has the same total','It changes the common difference','It removes negative terms','Equal pair totals produce n times the average of the endpoints.')],
'bridge':[
('If f(x)=x², which expression represents f(t+1)?','(t+1)²','t²+1','t=−1','The entire input t+1 replaces x.'),
('Why does (x+2)² contain a 4x term?','Two cross products each contribute 2x','The exponent adds to the coefficient','The square ignores constants','Multiplying (x+2)(x+2) produces 2x twice.'),
('Evaluating f(3) means…','Finding the output for input 3','Solving f(x)=3','Always finding an x-intercept','Function evaluation substitutes a specified input.'),
('Which correctly distributes 4 over x−2?','4x−8','4x−2','x−8','Both terms inside the parentheses are multiplied by 4.')]
}
