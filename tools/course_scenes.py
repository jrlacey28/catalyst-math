"""Shared original visual explanations for the 4A/4B/5 course; no quiz answers."""
from pathlib import Path
import json
import numpy as np
from manim import *

BLUE='#58C4DD';GOLD='#FFFF00';PINK='#D995CF';WHITE='#F2F2F2';DIM='#777777';GRID='#204450'
config.background_color='#000000';config.frame_width=16;config.frame_height=9

def M(s,size=42,color=WHITE): return MathTypst(s,font_size=size,color=color)
def T(s,size=23,color=DIM): return Text(s,font='Segoe UI',font_size=size,color=color)
def line(a,b,color=WHITE,width=3): return Line(np.array([*a,0]) if len(a)==2 else a,np.array([*b,0]) if len(b)==2 else b,color=color,stroke_width=width)
def dot(p,color=GOLD): return Dot(p,color=color,radius=.075)
def tag(s,p,color=WHITE,size=32): return M(s,size,color).move_to(p)
def xy(x,y): return np.array([x,y,0.])
def ticks(a,b,color=GOLD,count=1):
 p=(a+b)/2;v=b-a;v=np.array([-v[1],v[0],0]);v=v/np.linalg.norm(v)*.13
 unit=(b-a)/np.linalg.norm(b-a)
 return VGroup(*[Line(p-v+unit*(j-(count-1)/2)*.12,p+v+unit*(j-(count-1)/2)*.12,color=color,stroke_width=3) for j in range(count)])
def numberline(values,lo=0,hi=10,y=0,color=BLUE):
 n=NumberLine(x_range=[lo,hi,1],length=10,include_numbers=False,color=DIM,stroke_width=2).move_to(UP*y)
 nums=VGroup(*[M(str(i),24).next_to(n.n2p(i),DOWN,buff=.18) for i in range(lo,hi+1)])
 pts=VGroup()
 for i,v in enumerate(values):
  repeats=values[:i].count(v);pts.add(dot(n.n2p(v)+UP*(.2+.18*repeats),color))
 return VGroup(n,nums,pts),n

def axes(x_range=(-3,4,1),y_range=(-2,6,1),width=10,height=4.8):
 a=Axes(x_range=x_range,y_range=y_range,x_length=width,y_length=height,tips=False,axis_config={'include_ticks':True,'stroke_width':1.6,'color':DIM})
 grid=VGroup(*[Line(a.c2p(x,y_range[0]),a.c2p(x,y_range[1]),color=GRID,stroke_width=.6) for x in np.arange(x_range[0],x_range[1]+.01,x_range[2])],*[Line(a.c2p(x_range[0],y),a.c2p(x_range[1],y),color=GRID,stroke_width=.6) for y in np.arange(y_range[0],y_range[1]+.01,y_range[2])])
 nums=VGroup(*[M(str(int(x)),21,BLUE).next_to(a.c2p(x,0),DOWN,buff=.12) for x in np.arange(x_range[0],x_range[1]+.01,x_range[2]) if x!=0],*[M(str(int(y)),21,GOLD).next_to(a.c2p(0,y),LEFT,buff=.13) for y in np.arange(y_range[0],y_range[1]+.01,y_range[2]) if y!=0])
 return VGroup(grid,a,nums),a

class CourseScene(Scene):
 lesson_path=None
 def construct(self):
  p=self.lesson_path;self.meta=json.loads((p/'lesson.json').read_text());beats=json.loads((p/'timings.json').read_text())
  self.hud=VGroup(T(self.meta['course'].upper(),18).to_corner(UL,buff=.35),T(f"LESSON {self.meta['index']:02d} / {self.meta['total']:02d}",18).to_corner(UR,buff=.35)).set_z_index(100);self.add(self.hud)
  self.diagram=None;self.eq=None;times=[]
  method=getattr(self,'draw_'+self.meta['slug'].replace('-','_'))
  for i,b in enumerate(beats):
   start=self.time;self.add_sound(str(p/b['audio']))
   eq=M(self.meta['formulas'][i],48)
   if eq.width>13: eq.scale_to_fit_width(13)
   eq.move_to(UP*3.0)
   self.trace_path=None
   g=method(i)
   if g.width>13: g.scale_to_fit_width(13)
   if g.height>5.2: g.scale_to_fit_height(5.2)
   g.move_to(DOWN*.4)
   if self.diagram is None:
    self.play(Create(g),Write(eq),run_time=2.4);self.diagram=g;self.eq=eq
   else:
    self.play(ReplacementTransform(self.diagram,g),TransformMatchingShapes(self.eq,eq),run_time=2);self.diagram=g;self.eq=eq
   self.animate_geometry(i)
   # A moving highlight follows a relevant geometric object, never a decorative title.
   if self.trace_path is not None:
    self.wait(1);pulse=Dot(self.trace_path.get_start(),radius=.065,color=GOLD);self.add(pulse)
    self.play(MoveAlongPath(pulse,self.trace_path),run_time=3,rate_func=linear);self.play(FadeOut(pulse),run_time=.35)
   rem=b['duration']-(self.time-start)
   if rem<0: raise ValueError(f'Cue overrun {self.meta["id"]} {i}')
   self.wait(rem);times.append({'phase':i,'start':start,'duration':self.time-start})
  (p/'render_cues.json').write_text(json.dumps(times,indent=2))

 def animate_geometry(self,k):
  slug=self.meta['slug'];g=self.diagram
  if slug=='angles' and k==0:
   self.wait(4);o=g[1].get_start()
   self.play(Rotate(g[1],PI/2,about_point=o),Transform(g[2],Arc(1.1,angle=PI,arc_center=o,color=GOLD)),Transform(g[3],tag('180 degree',o+UP*1.45,GOLD)),run_time=3)
  elif slug=='triangles' and k==0:
   self.wait(1);o=g[-2].get_center();angles=[np.arctan2(3.3,3.6),np.arctan2(3.3,2.4)];angles.append(PI-sum(angles));start=0;copies=VGroup()
   for j,v in enumerate(angles):
    c=g[j+1].copy();self.add(c);self.play(Transform(c,Arc(.65,start_angle=start,angle=v,arc_center=o,color=[BLUE,GOLD,PINK][j])),run_time=.8);copies.add(c);start+=v
   g.add(copies)
  elif slug=='circles' and k==1:
   self.wait(1);copy=g[0].copy().set_color(GOLD);self.add(copy);self.play(Transform(copy,g[4].copy()),run_time=3);self.remove(copy)
  elif slug=='area' and k==1:
   self.wait(1);a,b,c,d=g[0].get_vertices();foot=xy(d[0],a[1]);remaining=Polygon(foot,b,c,d,color=BLUE,fill_opacity=.1)
   self.play(Transform(g[0],remaining),g[4].animate.shift(RIGHT*(b[0]-a[0])),run_time=3)

 def draw_angles(self,k):
  if k==3:
   a=np.deg2rad(55);g=VGroup(line((-5,1),(5,1)),line((-5,-1),(5,-1)),line((-2,-2.85),(2,2.85),BLUE))
   for y in [-1,1]:
    x=y/np.tan(a);g.add(Arc(.7,start_angle=0,angle=a,arc_center=xy(x,y),color=GOLD),tag('55 degree',xy(x+1.1,y+.45),GOLD,29))
   return g
  a=PI/2 if k==0 else np.deg2rad(55);o=xy(0,0)
  g=VGroup(line((-4,0),(4,0)),Line(o,3.5*np.array([np.cos(a),np.sin(a),0]),color=BLUE),Arc(1.1,start_angle=0,angle=a,color=GOLD),tag('90 degree' if k==0 else '55 degree',xy(1.5,.75),GOLD))
  if k>=1:g.add(Arc(1.55,start_angle=a,angle=PI-a,color=BLUE),tag('125 degree',xy(-1.25,1.4),BLUE))
  if k==2:g.add(Line(o,-3.5*np.array([np.cos(a),np.sin(a),0]),color=BLUE),Arc(1.1,start_angle=PI,angle=a,color=GOLD),tag('55 degree',xy(-1.6,-.75),GOLD))
  return g

 def draw_triangles(self,k):
  if k==1:
   return VGroup(line((-3,-1),(3,-1)),tag('6',xy(0,-1.4)),line((-3,0),(-1,0),BLUE,6),tag('2',xy(-2,.4),BLUE),line((-1,0),(2,0),GOLD,6),tag('3',xy(.5,.4),GOLD),DashedLine(xy(2,0),xy(3,0),color=PINK),tag('2+3<6',xy(0,1.5),PINK))
  if k>=2:
   a=xy(0,0);b=xy(4,0);c=xy(4,3)
   g=VGroup(Polygon(a,b,c,color=WHITE),Polygon(a,b,xy(4,-4),xy(0,-4),color=BLUE,fill_opacity=.15),Polygon(b,c,xy(7,3),xy(7,0),color=GOLD,fill_opacity=.15),Polygon(a,c,xy(1,7),xy(-3,4),color=PINK,fill_opacity=.12),tag('16',xy(2,-2),BLUE,60),tag('9',xy(5.5,1.5),GOLD,60),tag('25',xy(.5,3.5),PINK,60),RightAngle(Line(b,a),Line(b,c),length=.3))
   return g
  a,b,c=xy(-3,-1.5),xy(3,-1.5),xy(.6,1.8)
  return VGroup(Polygon(a,b,c,color=BLUE),Angle(Line(a,b),Line(a,c),radius=.65,color=GOLD),Angle(Line(b,c),Line(b,a),radius=.65,color=GOLD),Angle(Line(c,a),Line(c,b),radius=.65,color=GOLD),tag('alpha',a+xy(.95,.35)),tag('beta',b+xy(-.95,.35)),tag('gamma',c+xy(0,-.95)),Line(xy(-2,-2.5),xy(2,-2.5),color=GOLD),tag('180 degree',xy(0,-3),GOLD))

 def draw_congruence(self,k):
  pts=[xy(-2,-1.4),xy(-.9,1.4),xy(1.5,-1.4)]
  def tri(offset,letters,scale=1):
   p=[q*scale+offset for q in pts];g=VGroup(Polygon(*p,color=BLUE if letters=='ABC' else GOLD))
   for j,(q,c) in enumerate(zip(p,letters)):g.add(tag(c,q+xy(0,.35 if j==1 else -.35),size=28))
   if k in [1,2]:
    for j in range(3):g.add(ticks(p[j],p[(j+1)%3],PINK,j+1))
   return g
  return VGroup(tri(xy(-3,0),'ABC'),tri(xy(3,0),'DEF',1.35 if k==3 else 1))

 def draw_similarity(self,k):
  small=Polygon(xy(-5,-1.5),xy(-3,-1.5),xy(-5,0),color=BLUE,fill_opacity=.12)
  big=Polygon(xy(0,-1.5),xy(4,-1.5),xy(0,1.5),color=GOLD,fill_opacity=.12)
  if k==2:
   g=VGroup(Square(side_length=1.5,color=BLUE,fill_opacity=.15).move_to(LEFT*3))
   for x in [0,1.5]:
    for y in [-.75,.75]:g.add(Square(side_length=1.5,color=GOLD,fill_opacity=.15).move_to(xy(x+1,y)))
   g.add(tag('1',xy(-3,0),BLUE),tag('4',xy(1.75,2),GOLD));return g
  return VGroup(small,big,tag('3',xy(-5.4,-.7),BLUE),tag('4',xy(-4,-1.9),BLUE),tag('6',xy(-.5,0),GOLD),tag('8',xy(2,-1.9),GOLD),Arrow(xy(-2,0),xy(-.7,0),color=WHITE),tag('k=2',xy(-1.5,.7)))

 def draw_circles(self,k):
  c=Circle(2,color=BLUE);g=VGroup(c,dot(ORIGIN,WHITE),Line(ORIGIN,RIGHT*2,color=GOLD),tag('r',xy(1,.25),GOLD))
  if k==0:g.add(Line(LEFT*2,RIGHT*2,color=BLUE),tag('d=2r',xy(0,-2.5)))
  if k==1:g.add(Line(xy(-2*PI,-2.7),xy(2*PI,-2.7),color=GOLD),tag('2 pi r',xy(0,-3.15),GOLD))
  if k>=2:g.add(Sector(radius=2,angle=PI/2,color=GOLD,fill_opacity=.25),Arc(2,angle=PI/2,color=GOLD,stroke_width=7),Line(ORIGIN,UP*2,color=GOLD),tag('90 degree',xy(.65,.65),GOLD,29))
  return g

 def draw_area(self,k):
  if k==0:
   g=VGroup()
   for x in range(5):
    for y in range(3):g.add(Square(1,color=BLUE,stroke_width=1.5,fill_opacity=.12).move_to(xy(x-2,y-1)))
   return g
  if k==1:
   return VGroup(Polygon(xy(-3,-1.4),xy(2,-1.4),xy(3.3,1.4),xy(-1.7,1.4),color=BLUE,fill_opacity=.1),DashedLine(xy(-1.7,1.4),xy(-1.7,-1.4),color=GOLD),tag('h',xy(-1.4,0),GOLD),tag('b',xy(-.5,-1.85)),Polygon(xy(-3,-1.4),xy(-1.7,-1.4),xy(-1.7,1.4),color=PINK,fill_opacity=.35))
  if k==2:
   a,b,c,d=xy(-3,-1.5),xy(2,-1.5),xy(3,1.5),xy(-2,1.5)
   return VGroup(Polygon(a,b,c,color=BLUE,fill_opacity=.2),Polygon(a,c,d,color=GOLD,fill_opacity=.15),DashedLine(xy(-2,-1.5),d,color=WHITE),tag('b',xy(-.5,-1.9)),tag('h',xy(-1.7,0)))
  return VGroup(Polygon(xy(-3,-1.5),xy(3,-1.5),xy(1.5,1.5),xy(-1.5,1.5),color=BLUE,fill_opacity=.15),tag('a',xy(0,1.9)),tag('b',xy(0,-1.9)),DashedLine(xy(1.5,-1.5),xy(1.5,1.5),color=GOLD),tag('h',xy(1.8,0),GOLD))

 def draw_volume(self,k):
  if k in [0,3]:
   front=[xy(-2,-1.5),xy(1,-1.5),xy(1,1),xy(-2,1)];off=xy(1.2,.8)
   g=VGroup(Polygon(*front,color=BLUE,fill_opacity=.1),Polygon(*[q+off for q in front],color=BLUE))
   for q in front:g.add(Line(q,q+off,color=BLUE))
   if k==0:
    for y in np.linspace(-1.1,.6,5):g.add(Polygon(xy(-2,y),xy(1,y),xy(2.2,y+.8),xy(-.8,y+.8),color=GOLD,stroke_width=1,fill_opacity=.07))
   else:
    g.add(Polygon(front[0],front[1],front[2],front[3],color=GOLD,fill_opacity=.3),tag('l',xy(-.5,-1.9)),tag('h',xy(-2.5,-.2)),tag('w',xy(2,-1.25)))
   return g
  bottom=Ellipse(width=4,height=1.1,color=BLUE).move_to(DOWN*1.7)
  if k==1:
   top=bottom.copy().shift(UP*3.4);g=VGroup(bottom,top,line((-2,-1.7),(-2,1.7),BLUE),line((2,-1.7),(2,1.7),BLUE))
   for y in [-1,-.3,.4,1.1]:g.add(Ellipse(width=4,height=1.1,color=GOLD,stroke_width=1).move_to(UP*y))
   return g
  return VGroup(bottom,Line(xy(-2,-1.7),xy(0,2),color=BLUE),Line(xy(2,-1.7),xy(0,2),color=BLUE),DashedLine(xy(0,-1.7),xy(0,2),color=GOLD),tag('h',xy(.35,.2),GOLD),Line(xy(0,-1.7),xy(2,-1.7),color=GOLD),tag('r',xy(1,-2),GOLD))

 def draw_coordinate_geometry(self,k):
  g,a=axes((0,5,1),(0,7,1));p=a.c2p(1,2);q=a.c2p(4,6);corner=a.c2p(4,2)
  g.add(dot(p,BLUE),dot(q,GOLD),tag('(1,2)',p+xy(-.3,-.4),BLUE,28),tag('(4,6)',q+xy(.3,.35),GOLD,28),Line(p,q,color=WHITE),DashedLine(p,corner,color=BLUE),DashedLine(corner,q,color=GOLD))
  if k in [0,1,3]:g.add(tag('3', (p+corner)/2+DOWN*.3,BLUE,29),tag('4',(q+corner)/2+RIGHT*.3,GOLD,29))
  if k==2:g.add(dot((p+q)/2,PINK),tag('(2.5,4)',(p+q)/2+xy(-1,.4),PINK,30))
  return g

 def draw_proof(self,k):
  a,b,c,d=xy(0,1.8),xy(-3,-1.7),xy(3,-1.7),xy(0,-1.7)
  g=VGroup(Polygon(a,b,c,color=WHITE),ticks(a,b),ticks(a,c),tag('A',a+UP*.35),tag('B',b+LEFT*.35),tag('C',c+RIGHT*.35))
  if k>=1:g.add(Line(a,d,color=PINK),ticks(b,d,BLUE,2),ticks(d,c,BLUE,2),tag('D',d+DOWN*.35))
  if k>=2:g.add(Polygon(a,b,d,color=BLUE,fill_opacity=.16),Polygon(a,c,d,color=GOLD,fill_opacity=.16))
  if k==3:g.add(Angle(Line(b,c),Line(b,a),radius=.7,color=GOLD),Angle(Line(c,a),Line(c,b),radius=.7,color=GOLD))
  return g

 def draw_center(self,k):
  values=[1,2,2,3,7] if k!=3 else [1,2,2,3,22]
  heights=[3]*5 if k==1 else values;scale=.55 if k<3 else .19
  g=VGroup(Line(xy(-4,-1.7),xy(4,-1.7),color=DIM))
  for i,(v,h) in enumerate(zip(values,heights)):
   x=(i-2)*1.45;bar=Rectangle(width=.8,height=h*scale,color=BLUE,fill_opacity=.28).move_to(xy(x,-1.7+h*scale/2))
   if k==2 and i==2:bar.set_color(PINK)
   g.add(bar,tag(str(h),xy(x,-2.1),BLUE,30))
  mean=sum(values)/5;ym=-1.7+mean*scale
  if k in [1,3]:g.add(DashedLine(xy(-4,ym),xy(4,ym),color=GOLD),tag('overline(x)='+str(int(mean)),xy(4.9,ym),GOLD,29))
  if k==2:g.add(tag('"median"=2',xy(0,2.4),PINK,34),tag('"mode"=2',xy(3,1),BLUE,31))
  if k==3:g.add(tag('"median"=2',xy(3.8,-1.15),PINK,28))
  return g

 def draw_variance(self,k):
  g,n=numberline([2,4,6],0,8,y=1.2)
  mean=n.n2p(4);g.add(DashedLine(mean+DOWN*.4,mean+UP*.6,color=GOLD),tag('mu=4',mean+UP*.95,GOLD,30))
  if k>=1:
   for x,d in [(-3,-2),(0,0),(3,2)]:
    size=1.1 if d else .03;sq=Square(side_length=size,color=PINK,fill_opacity=.22).move_to(xy(x,-1.3))
    g.add(sq,tag(str(d*d),xy(x,-1.3),PINK,30),tag('('+str(d)+')^2',xy(x,-2.2),WHITE,29))
  if k==0:
   g.add(Line(n.n2p(2)+DOWN*.5,mean+DOWN*.5,color=PINK),Line(mean+DOWN*.85,n.n2p(6)+DOWN*.85,color=PINK),tag('-2',xy(-1.25,.15),PINK,28),tag('+2',xy(1.25,-.2),PINK,28))
  return g

 def draw_standard_deviation(self,k):
  if k==0:return VGroup(Square(2,color=BLUE,fill_opacity=.15).shift(LEFT*2),tag('4',LEFT*2,BLUE,55),Arrow(LEFT*.5,RIGHT*1,color=WHITE),Line(xy(1.7,0),xy(3.7,0),color=GOLD,stroke_width=6),tag('2',xy(2.7,.5),GOLD,45))
  if k==1:
   g,n=numberline([2,2,6,6],0,8);g.add(tag('mu=4',n.n2p(4)+UP*1.3,GOLD),BraceBetweenPoints(n.n2p(4)+UP*.6,n.n2p(6)+UP*.6,UP,color=PINK),tag('sigma=2',xy(1,2),PINK));return g
  if k==2:
   g,n=numberline([2,2,6,6],0,14,y=1.3);g2,n2=numberline([7,7,11,11],0,14,y=-1.3,color=GOLD);g.add(g2,tag('+5',xy(5.8,0),PINK,35));return g
  g,n=numberline([2,2,6,6],0,20,y=1.3);g2,n2=numberline([6,6,18,18],0,20,y=-1.3,color=GOLD);g.add(g2,tag('times 3',xy(5.8,0),PINK,35));return g

 def draw_distributions(self,k):
  vals=[1,3,5,3,1] if k in [0,2] else ([6,4,2,1,1] if k==1 else [2,5,3])
  g=VGroup(Line(xy(-4,-1.7),xy(4,-1.7),color=DIM),Line(xy(-4,-1.7),xy(-4,2.2),color=DIM))
  for i,v in enumerate(vals):
   x=-3+i*1.45;h=v*.5
   g.add(Rectangle(width=1.4,height=h,color=BLUE,fill_opacity=.3).move_to(xy(x,-1.7+h/2)),tag(str(v),xy(x,-1.45+h),GOLD,29),tag(str(i+1),xy(x,-2.1),WHITE,24))
   if k==3:g.add(tag(str(v*10)+'%',xy(x,.3+h*.05),GOLD,29))
  g.add(T('value / bin',21).move_to(xy(0,-2.6)),T('count',21).move_to(xy(-4.3,2.5)))
  return g

 def draw_correlation(self,k):
  g,a=axes((-3,3,1),(-3,3,1));xs=np.linspace(-2.5,2.5,11)
  for j,x in enumerate(xs):
   y=(x+.22*np.sin(4*x)) if k in [0,3] else (-x+.22*np.sin(4*x) if k==1 else .7*x*x-1.8)
   g.add(dot(a.c2p(x,y),BLUE))
  if k==3:g.add(dot(a.c2p(2.7,-2.7),PINK),Circle(.25,color=PINK).move_to(a.c2p(2.7,-2.7)))
  elif k in [0,1]:g.add(a.plot(lambda x:x if k==0 else -x,x_range=[-2.7,2.7],color=GOLD,stroke_width=2))
  return g

 def draw_probability(self,k):
  if k==0:
   g=VGroup()
   for i in range(1,7):
    p=xy((i-1)%3*2.4-2.4,1 if i<=3 else -1);c=GOLD if i%2==0 else BLUE
    g.add(Square(1.4,color=c).move_to(p),tag(str(i),p,c,45))
   return g
  if k==3:
   return VGroup(Circle(1.8,color=BLUE,fill_opacity=.18).shift(LEFT),Circle(1.8,color=GOLD,fill_opacity=.18).shift(RIGHT),tag('A',xy(-2,.5),BLUE),tag('B',xy(2,.5),GOLD),tag('A inter B',xy(0,0),PINK,28))
  top=xy(0,2);left=xy(-3,0);right=xy(3,0);leaves=[xy(-4.5,-2),xy(-1.5,-2),xy(1.5,-2),xy(4.5,-2)]
  g=VGroup(dot(top,WHITE),Line(top,left,color=BLUE),Line(top,right,color=BLUE),tag('3/5',xy(-2,1.25)),tag('2/5',xy(2,1.25)),tag('R',left+LEFT*.3,GOLD),tag('B',right+RIGHT*.3,BLUE))
  for i,(p,q,prob,name) in enumerate([(left,leaves[0],'2/4','RR'),(left,leaves[1],'2/4','RB'),(right,leaves[2],'3/4','BR'),(right,leaves[3],'1/4','BB')]):
   c=GOLD if (k==1 and i==0) or (k==2 and i==3) else DIM
   g.add(Line(p,q,color=c),tag(prob,(p+q)/2+xy(.35,0),c,27),tag('"'+name+'"',q+DOWN*.4,c,29))
  return g

 def draw_quadratics(self,k):
  if k==1:
   g=VGroup(Square(2.7,color=BLUE,fill_opacity=.17).move_to(xy(-.65,.65)),Rectangle(width=1.3,height=2.7,color=GOLD,fill_opacity=.15).move_to(xy(1.35,.65)),Rectangle(width=2.7,height=1.3,color=GOLD,fill_opacity=.15).move_to(xy(-.65,-1.35)),Square(1.3,color=PINK,fill_opacity=.22).move_to(xy(1.35,-1.35)))
   g.add(tag('x^2',xy(-.65,.65),BLUE,43),tag('3x',xy(1.35,.65),GOLD),tag('3x',xy(-.65,-1.35),GOLD),tag('9',xy(1.35,-1.35),PINK),tag('x+3',xy(0,-2.5)))
   return g
  g,a=axes((-6,1,1),(-5,6,1));c=a.plot(lambda x:(x+3)**2-4,x_range=[-6,.15],color=BLUE);g.add(c);self.trace_path=c
  for x in [-5,-1]:g.add(dot(a.c2p(x,0),GOLD))
  if k>=2:g.add(dot(a.c2p(-3,-4),PINK),tag('(-3,-4)',a.c2p(-3,-4)+DOWN*.38,PINK,26))
  if k==3:g.add(T('two real roots',25).move_to(a.c2p(-2,4)))
  return g

 def draw_polynomials(self,k):
  g,a=axes((-3,3,1),(-5,8,1));c=a.plot(lambda x:(x+2)*(x-1)**2,x_range=[-2.43,2.2],color=BLUE);g.add(c);self.trace_path=c
  if k>=1:
   for x in [-2,1]:g.add(dot(a.c2p(x,0),GOLD),Circle(.18,color=GOLD).move_to(a.c2p(x,0)))
  if k>=2:g.add(tag('1',a.c2p(-2,0)+UP*.6,GOLD),tag('2',a.c2p(1,0)+UP*.6,GOLD),T('multiplicity',21).move_to(a.c2p(0,6)))
  if k==3:g.add(Arrow(a.c2p(-2.25,-2.5),a.c2p(-2.43,-5),color=PINK),Arrow(a.c2p(2,4),a.c2p(2.2,6.05),color=PINK))
  return g

 def draw_rational_functions(self,k):
  g,a=axes((-3,5,1),(-4,5,1))
  if k<=1:
   g.add(a.plot(lambda x:x+1,x_range=[-3,4],color=BLUE),Circle(.12,color=GOLD,fill_color=BLACK,fill_opacity=1).move_to(a.c2p(1,2)),tag('(1,2)',a.c2p(1,2)+xy(1,.4),GOLD,29))
  elif k==2:
   for r in [[-3,1.5],[2.4,5]]:g.add(a.plot(lambda x:2/(x-2),x_range=r,color=BLUE))
   g.add(DashedLine(a.c2p(2,-4),a.c2p(2,5),color=PINK),tag('x=2',a.c2p(2,4)+RIGHT*.6,PINK,26))
  else:
   for r in [[-3,.8],[1.25,5]]:g.add(a.plot(lambda x:x/(x-1),x_range=r,color=BLUE))
   g.add(Line(a.c2p(-3,2),a.c2p(5,2),color=GOLD),dot(a.c2p(2,2),PINK),tag('(2,2)',a.c2p(2,2)+UP*.5,PINK,29))
  return g

 def draw_radicals(self,k):
  if k==0:
   g=VGroup(Square(2.4,color=BLUE,fill_opacity=.15).shift(LEFT*2.5),tag('9',LEFT*2.5,BLUE,50),tag('3',xy(-2.5,-1.65),GOLD))
   n=NumberLine(x_range=[-4,4,1],length=5,color=DIM).shift(RIGHT*2.3);g.add(n,dot(n.n2p(-3)),dot(n.n2p(3)),tag('-3',n.n2p(-3)+DOWN*.45),tag('3',n.n2p(3)+DOWN*.45));return g
  if k==1:
   return VGroup(Square(3,color=BLUE,fill_opacity=.15),tag('72',ORIGIN,BLUE,50),tag('6sqrt(2)',DOWN*1.95,GOLD,40),tag('36 times 2',UP*2.0,WHITE,36))
  g,a=axes((-1,5,1),(-2,4,1));g.add(a.plot(lambda x:np.sqrt(x+1),x_range=[-1,5],color=BLUE),a.plot(lambda x:x-1,x_range=[-1,5],color=GOLD),dot(a.c2p(3,2),PINK))
  if k==3:g.add(dot(a.c2p(0,1),BLUE),dot(a.c2p(0,-1),GOLD),DashedLine(a.c2p(0,-1),a.c2p(0,1),color=PINK),tag('(3,2)',a.c2p(3,2)+UP*.5,PINK,29))
  return g

 def draw_complex_numbers(self,k):
  g,a=axes((-4,4,1),(-3,4,1),width=6,height=5.25);g.add(T('real',23).next_to(a.c2p(4,0),RIGHT),T('imaginary',23).next_to(a.c2p(0,4),UP))
  if k==0:g.add(Arrow(a.c2p(0,0),a.c2p(2,3),buff=0,color=BLUE),dot(a.c2p(2,3)),tag('2+3i',a.c2p(2,3)+RIGHT*.75,BLUE,32))
  elif k==1:g.add(Arrow(a.c2p(0,0),a.c2p(2,1),buff=0,color=BLUE),Arrow(a.c2p(2,1),a.c2p(3,3),buff=0,color=GOLD),Arrow(a.c2p(0,0),a.c2p(3,3),buff=0,color=PINK),tag('3+3i',a.c2p(3,3)+UP*.45,PINK,29))
  elif k==2:
   for j,(x,y,s) in enumerate([(1,0,'1'),(0,1,'i'),(-1,0,'-1'),(0,-1,'-i')]):
    g.add(dot(a.c2p(x,y)),tag(s,a.c2p(x,y)+xy(.3 if x>=0 else -.3,.3 if y>=0 else -.3),GOLD,28))
   # Parametric circle uses coordinate units, preserving quarter-turn correspondence.
   c=ParametricFunction(lambda t:a.c2p(np.cos(t),np.sin(t)),t_range=[0,2*PI],color=BLUE);g.add(c);self.trace_path=c
  else:g.add(Arrow(a.c2p(0,0),a.c2p(1,1),buff=0,color=BLUE),Arrow(a.c2p(0,0),a.c2p(0,2),buff=0,color=GOLD),tag('1+i',a.c2p(1,1)+RIGHT*.7,BLUE),tag('2i',a.c2p(0,2)+LEFT*.5,GOLD))
  return g

 def draw_exponentials(self,k):
  g,a=axes((0,5,1),(0,10,2));f=(lambda x:8*.5**x) if k==2 else (lambda x:2*1.5**x)
  c=a.plot(f,x_range=[0,5 if k==2 else 3.9],color=BLUE);g.add(c);self.trace_path=c
  for x in range(5 if k==2 else 4):g.add(dot(a.c2p(x,f(x)),GOLD))
  if k==0:g.add(a.plot(lambda x:2+x,x_range=[0,5],color=PINK),T('+1 each step',21,PINK).move_to(a.c2p(3,3)))
  elif k==1:g.add(tag('a=2',a.c2p(.5,8),GOLD),tag('b=1.5',a.c2p(3,8),GOLD))
  elif k==3:g.add(T('50% growth per step',25).move_to(a.c2p(2,8)))
  return g

 def draw_logarithms(self,k):
  if k==3:
   g,a=axes((0,4,1),(0,12,2));c=a.plot(lambda x:2**x,x_range=[0,3.58],color=BLUE);g.add(c,Line(a.c2p(0,10),a.c2p(4,10),color=GOLD),dot(a.c2p(np.log2(10),10),PINK),DashedLine(a.c2p(np.log2(10),0),a.c2p(np.log2(10),10),color=PINK));self.trace_path=c;return g
  g,a=axes((-3,9,1),(-3,9,1),width=6,height=6)
  c=a.plot(lambda x:np.log2(x),x_range=[.125,9],color=GOLD);g.add(c,a.plot(lambda x:2**x,x_range=[-3,np.log2(9)],color=BLUE),DashedLine(a.c2p(-3,-3),a.c2p(9,9),color=DIM));self.trace_path=c
  if k in [0,1]:g.add(dot(a.c2p(3,8),BLUE),dot(a.c2p(8,3),GOLD),tag('(3,8)',a.c2p(3,8)+LEFT*.6,BLUE,26),tag('(8,3)',a.c2p(8,3)+DOWN*.45,GOLD,26))
  if k==2:g.add(tag('2^3 times 2^2=2^5',xy(5,1),WHITE,33),tag('3+2=5',xy(5,-.5),GOLD,36))
  return g

 def draw_sequences(self,k):
  vals=[3,7,11,15] if k<=1 else [3,6,12,24];g,a=axes((0,5,1),(0,28,4))
  for i,v in enumerate(vals):
   p=a.c2p(i+1,v);g.add(dot(p,BLUE),tag(str(v),p+UP*.4,GOLD,30))
   if i and k>=1:g.add(Arrow(a.c2p(i,vals[i-1]),p,buff=.15,color=DIM),tag('+4' if k==1 else 'times 2',(a.c2p(i,vals[i-1])+p)/2+LEFT*.25,PINK,24))
  if k==3:g.add(Circle(.17,color=GOLD).move_to(a.c2p(1,3)))
  return g

 def draw_series(self,k):
  if k<=1:
   g=VGroup()
   for i in range(4):
    for j in range(i+1):g.add(Square(.65,color=BLUE,fill_opacity=.2).move_to(xy(i*.85-1.3,j*.65-1)))
    g.add(tag(str(i+1),xy(i*.85-1.3,-1.6),GOLD,29))
   if k==1:
    for i in range(4):
     for j in range(4-i):g.add(Square(.65,color=GOLD,fill_opacity=.15).move_to(xy(i*.85-1.3,(j+i+1)*.65-1)))
    g.add(tag('2S_4=4 times 5',xy(0,2.4),PINK,38))
   return g
  g=VGroup(Rectangle(width=8,height=1.6,color=DIM),tag('0',xy(-4,-1.2)),tag('2',xy(4,-1.2),GOLD))
  left=-4
  for i in range(4 if k==2 else 8):
   w=4/(2**i);g.add(Rectangle(width=w,height=1.6,color=BLUE if i%2==0 else GOLD,fill_opacity=.25).move_to(xy(left+w/2,0)))
   if i<3:g.add(tag(['1','1/2','1/4'][i],xy(left+w/2,0),WHITE,32))
   left+=w
  g.add(DashedLine(xy(4,-.8),xy(4,1.6),color=PINK),tag('S_n -> 2',xy(0,2),PINK,37));return g

