"""Original, data-directed Manim mathematical animations for the complete roadmap.

The mathematical objects change with the explanation; narration carries the prose.
The source specifications are checked before rendering, never accepted from HTTP.
"""
from pathlib import Path
import ast
import json
import math
import numpy as np
from manim import *

COLORS = dict(blue='#58C4DD', gold='#FFE569', pink='#D995CF', green='#83C995')
WHITE = '#EEEEEE'
DIM = '#7B858E'
GRID = '#18323D'
config.background_color = '#000000'
config.frame_width = 16
config.frame_height = 9


def col(value):
    return COLORS.get(value, value if str(value).startswith('#') else COLORS['blue'])


def text(s, size=24, color=WHITE):
    return Text(str(s), font='Segoe UI', font_size=size, color=color)


def formula(s, size=43, color=WHITE):
    return MathTypst(str(s), font_size=size, color=color)


def p(x, y):
    return np.array([x, y, 0.])


def expression(source):
    tree = ast.parse(source, mode='eval')
    names = {name: getattr(math, name) for name in ('sin', 'cos', 'tan', 'exp', 'log', 'sqrt')}
    names.update(abs=abs, pi=math.pi)
    allowed = (ast.Expression, ast.BinOp, ast.UnaryOp, ast.Constant, ast.Name, ast.Load,
               ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Pow, ast.USub, ast.UAdd, ast.Call)
    for node in ast.walk(tree):
        if not isinstance(node, allowed):
            raise ValueError('Unsupported mathematical expression: '+source)
        if isinstance(node, ast.Name) and node.id not in {*names, 'x'}:
            raise ValueError('Unknown name: '+node.id)
        if isinstance(node, ast.Call) and (not isinstance(node.func, ast.Name) or node.func.id not in names):
            raise ValueError('Unsupported function')
    code = compile(tree, '<authored mathematics>', 'eval')
    return lambda x: float(eval(code, {'__builtins__': {}}, {**names, 'x': float(x)}))


def nice_step(lo, hi):
    raw = max((hi-lo)/7, 1e-12)
    power = 10**math.floor(math.log10(raw))
    return min((1, 2, 5, 10), key=lambda k: abs(k*power-raw))*power


def axes(x, y, width=11.3, height=4.8):
    sx, sy = nice_step(*x), nice_step(*y)
    a = Axes(x_range=[*x, sx], y_range=[*y, sy], x_length=width, y_length=height,
             tips=False, axis_config={'color': DIM, 'stroke_width': 1.4, 'include_ticks': False})
    g = VGroup()
    for v in np.arange(math.ceil(x[0]/sx)*sx, x[1]+sx*.01, sx):
        if abs(v)<abs(sx)*1e-8:v=0.0
        g.add(Line(a.c2p(v, y[0]), a.c2p(v, y[1]), color=GRID, stroke_width=.8))
        g.add(text(f'{v:g}', 19, COLORS['blue']).next_to(a.c2p(v, max(y[0], min(0, y[1]))), DOWN, buff=.12))
    for v in np.arange(math.ceil(y[0]/sy)*sy, y[1]+sy*.01, sy):
        if abs(v)<abs(sy)*1e-8:v=0.0
        g.add(Line(a.c2p(x[0], v), a.c2p(x[1], v), color=GRID, stroke_width=.8))
        if abs(v)>.0001:
            g.add(text(f'{v:g}', 19, COLORS['gold']).next_to(a.c2p(max(x[0], min(0, x[1])), v), LEFT, buff=.12))
    g.add(a)
    return g, a


def graph_curve(a, fn, domain, yrange, color):
    paths, points = [], []
    for x in np.linspace(*domain, 260):
        try:
            y = fn(x)
        except (ValueError, ZeroDivisionError, OverflowError):
            y = float('nan')
        if math.isfinite(y) and yrange[0] <= y <= yrange[1]:
            points.append(a.c2p(x, y))
        else:
            if len(points)>1:
                paths.append(VMobject(color=color, stroke_width=3).set_points_as_corners(points))
            points=[]
    if len(points)>1:
        paths.append(VMobject(color=color, stroke_width=3).set_points_as_corners(points))
    return VGroup(*paths)


def draw(v):
    """Return the diagram and optional semantic path for a moving point."""
    kind=v['kind']; g=VGroup(); motion=None
    if kind=='dots':
        groups=v['groups']; n=len(groups); labels=v.get('labels', [str(x) for x in groups])
        for i, count in enumerate(groups):
            cols=max(1, min(6, math.ceil(math.sqrt(max(count, 1)))))
            block=VGroup(*[Dot(p(j%cols*.42, -(j//cols)*.42), radius=.115, color=col(['blue','gold','pink'][i%3])) for j in range(count)])
            if not count:
                block.add(Circle(.6, color=DIM, stroke_width=1.5))
            block.move_to(p((i-(n-1)/2)*3.2, .3));g.add(block)
            if i<len(labels):g.add(text(labels[i], 36, col(['blue','gold','pink'][i%3])).next_to(block, DOWN, buff=.55))
    elif kind=='numberline':
        lo, hi=v['range']; step=nice_step(lo, hi)
        a=NumberLine(x_range=[lo,hi,step], length=11, include_numbers=False, color=DIM, stroke_width=2)
        g.add(a)
        for q in np.arange(math.ceil(lo/step)*step,hi+step*.01,step):
            if abs(q)<abs(step)*1e-8:q=0.0
            g.add(text(f'{q:g}',23).next_to(a.n2p(q),DOWN,buff=.2))
        if 'interval' in v:
            g.add(Line(a.n2p(v['interval'][0]),a.n2p(v['interval'][1]),color=COLORS['gold'],stroke_width=8))
        points=v.get('points',[])
        for j,q in enumerate(points):
            g.add(Dot(a.n2p(q),radius=.1,color=col(['blue','gold','pink'][j%3]),fill_opacity=0 if q in v.get('open',[]) else 1,stroke_width=3))
            labels=v.get('labels',[])
            if j<len(labels):g.add(text(labels[j],26,col(['blue','gold','pink'][j%3])).next_to(a.n2p(q),UP,buff=1.05 if v.get('arrows') else .3))
        for j,(start,end) in enumerate(v.get('arrows',[])):
            if start==end:continue
            path=ArcBetweenPoints(a.n2p(start)+UP*.35,a.n2p(end)+UP*.35,angle=-PI/3 if end>start else PI/3,color=COLORS['gold'])
            path.add_tip(tip_length=.15);g.add(path);motion=path
    elif kind=='bars':
        values=v['values']; top=max(max(values),v.get('mean',0),1)*1.15
        n=len(values); w=min(.85,9/max(n,1)); base=-2.1
        g.add(Line(p(-5.7,base),p(5.7,base),color=DIM,stroke_width=1.5))
        labels=v.get('labels',[str(i+1) for i in range(n)])
        for i,value in enumerate(values):
            x=(i-(n-1)/2)*min(1.4,10/max(n,1)); h=value/top*4.2
            g.add(Rectangle(width=w,height=max(.012,h),color=COLORS['blue'],fill_opacity=.32,stroke_width=2).move_to(p(x,base+h/2)))
            g.add(text(f'{value:g}',24,COLORS['gold']).move_to(p(x,base+h+.25)))
            if i<len(labels):g.add(text(labels[i],21).move_to(p(x,base-.4)))
        if 'mean' in v:
            y=base+v['mean']/top*4.2
            g.add(DashedLine(p(-5.3,y),p(5.3,y),color=COLORS['pink']),text('mean',22,COLORS['pink']).move_to(p(5.5,y+.28)))
    elif kind=='grid':
        rows,cols=v['rows'],v['cols'];s=min(.8,10/cols,4.6/rows)
        for i in range(rows*cols):
            primary=i//cols<v['fill_rows'] and i%cols<v['fill_cols'] if 'fill_rows' in v else i<v.get('filled',0)
            secondary=not primary and i<v.get('filled',0)+v.get('secondary',0) if 'fill_rows' not in v else False
            c=COLORS['gold'] if primary else COLORS['pink'] if secondary else COLORS['blue']
            g.add(Square(s,color=c,stroke_width=1.5,fill_opacity=.42 if primary or secondary else .04).move_to(p((i%cols-(cols-1)/2)*s,((rows-1)/2-i//cols)*s)))
    elif kind=='graph':
        xr,yr=v['x'],v['y']
        if v.get('equal'):
            scale=min(11.3/(xr[1]-xr[0]),4.8/(yr[1]-yr[0]))
            g,a=axes(xr,yr,(xr[1]-xr[0])*scale,(yr[1]-yr[0])*scale)
        else:g,a=axes(xr,yr)
        for i,c in enumerate(v['curves']):
            fn=expression(c['f']);domain=c.get('domain',xr);line=graph_curve(a,fn,domain,yr,col(c.get('color','blue')))
            g.add(line)
            if i==0 and v.get('sweep',True) and len(line):motion=max(line,key=lambda q:q.get_arc_length())
            if i==0 and 'shade' in v:
                low,high=v['shade']
                for x in np.linspace(low,high,28,endpoint=False):
                    dx=(high-low)/28;y=fn(x+dx/2)
                    if not math.isfinite(y) or y<yr[0] or y>yr[1]:continue
                    poly=Polygon(a.c2p(x,0),a.c2p(x+dx,0),a.c2p(x+dx,y),a.c2p(x,y),color=COLORS['gold'],stroke_width=.45,fill_opacity=.19)
                    g.add(poly)
        for seg in v.get('segments',[]):g.add(Line(a.c2p(*seg[0]),a.c2p(*seg[1]),color=COLORS['pink'],stroke_width=2.7))
        for i,point in enumerate(v.get('points',[])):
            q=a.c2p(*point);g.add(Dot(q,color=COLORS['gold'],radius=.07));labels=v.get('labels',[])
            if i<len(labels):g.add(text(labels[i],22).next_to(q,UP,buff=.2))
        for point in v.get('holes',[]):g.add(Dot(a.c2p(*point),radius=.095,color=COLORS['gold'],fill_color=BLACK,fill_opacity=1,stroke_width=2.5))
    elif kind=='plane':
        g,a=axes([-4,4],[-4,4],7,7)
        matrix=np.array(v.get('matrix',[[1,0],[0,1]]))
        for i,vec in enumerate(v.get('vectors',[])):
            source=np.array(vec);target=matrix@source;c=col(['blue','gold','pink'][i%3])
            if 'matrix' in v:
                g.add(DashedLine(a.c2p(0,0),a.c2p(*source),color=c,stroke_opacity=.35))
            if np.linalg.norm(target)>.00001:g.add(Arrow(a.c2p(0,0),a.c2p(*target),buff=0,color=c,stroke_width=4,max_tip_length_to_length_ratio=.15))
            g.add(text('('+', '.join(f'{q:g}' for q in target)+')',25,c).next_to(a.c2p(*target),UP,buff=.15))
        for point in v.get('points',[]):g.add(Dot(a.c2p(*point),color=COLORS['gold']))
    elif kind=='circle':
        r=v.get('radius',2);t=v['angle'];end=p(r*math.cos(t),r*math.sin(t))
        g.add(Line(p(-r-.3,0),p(r+.3,0),color=GRID),Line(p(0,-r-.3),p(0,r+.3),color=GRID),Circle(r,color=COLORS['blue'],stroke_width=2))
        g.add(Line(ORIGIN,end,color=WHITE,stroke_width=3),Dot(end,color=COLORS['gold'],radius=.085))
        if v.get('arc',True) and abs(t)>.001:
            arc=Arc(r,angle=t,color=COLORS['gold'],stroke_width=5);g.add(arc);motion=arc
            g.add(Arc(.45,angle=t,color=COLORS['pink']),formula('theta',27,COLORS['pink']).move_to(p(.75*math.cos(t/2),.75*math.sin(t/2))))
        if v.get('triangle'):
            foot=p(end[0],0);g.add(Line(ORIGIN,foot,color=COLORS['blue'],stroke_width=4),Line(foot,end,color=COLORS['gold'],stroke_width=4))
            g.add(formula('cos theta',28,COLORS['blue']).next_to(Line(ORIGIN,foot),DOWN,buff=.24),formula('sin theta',28,COLORS['gold']).next_to(Line(foot,end),RIGHT,buff=.24))
    elif kind=='network':
        names=v['nodes'];n=len(names);positions=[p(2.25*math.cos(PI/2+i*TAU/n),2.25*math.sin(PI/2+i*TAU/n)) for i in range(n)]
        for j,(a,b) in enumerate(v['edges']):
            if a==b:
                e=Arc(.48,start_angle=-.25,angle=TAU-.5,color=DIM).move_to(positions[a]+UP*.55)
            else:
                e=Arrow(positions[a],positions[b],buff=.45,color=DIM,stroke_width=2,max_tip_length_to_length_ratio=.12) if v.get('directed') else Line(positions[a],positions[b],buff=.4,color=DIM,stroke_width=2)
            g.add(e)
            if j<len(v.get('weights',[])):
                label=text(v['weights'][j],24,COLORS['gold']);label.move_to(e.get_center()+RIGHT*.28+UP*.15);label.add_background_rectangle(color=BLACK,opacity=1,buff=.08);g.add(label)
        for i,(pos,name) in enumerate(zip(positions,names)):
            c=COLORS['gold'] if i in v.get('active',[]) else COLORS['blue']
            node=Circle(.4,color=c,fill_color=BLACK,fill_opacity=1).move_to(pos)
            label=text(name,25,c)
            if label.width>.7:label.scale_to_fit_width(.7)
            label.move_to(pos);g.add(node,label)
    elif kind=='sets':
        a=Circle(1.7,color=COLORS['blue']).move_to(LEFT*.9);b=Circle(1.7,color=COLORS['gold']).move_to(RIGHT*.9)
        g.add(a,b)
        mode=v.get('highlight')
        if mode=='intersection':g.add(Intersection(a,b,color=COLORS['pink'],fill_opacity=.28,stroke_width=0))
        elif mode=='union':g.add(Union(a,b,color=COLORS['green'],fill_opacity=.12,stroke_width=0))
        elif mode=='left':g.add(a.copy().set_fill(COLORS['blue'],opacity=.15))
        for key,x in [('left',-1.6),('both',0),('right',1.6)]:
            vals=v.get(key,[])
            for i,val in enumerate(vals):g.add(text(val,29).move_to(p(x,(len(vals)-1)/2*.5-i*.5)))
        g.add(text('A',30,COLORS['blue']).move_to(p(-1.8,2.05)),text('B',30,COLORS['gold']).move_to(p(1.8,2.05)))
    elif kind=='sequence':
        vals=v['values'];lo=min([0,*vals]);hi=max([*vals,v.get('limit',0),.1]);pad=max((hi-lo)*.15,.1)
        g,a=axes([0,len(vals)+.8],[lo-pad,hi+pad])
        if v.get('connect') and len(vals)>1:
            motion=VMobject(color=COLORS['blue'],stroke_width=2.5).set_points_as_corners([a.c2p(i,value) for i,value in enumerate(vals,1)])
            g.add(motion)
        for i,value in enumerate(vals,1):
            if v.get('bars'):g.add(Line(a.c2p(i,0),a.c2p(i,value),color=COLORS['blue'],stroke_width=7))
            g.add(Dot(a.c2p(i,value),color=COLORS['blue'],radius=.07))
        if 'limit' in v:g.add(DashedLine(a.c2p(0,v['limit']),a.c2p(len(vals)+.8,v['limit']),color=COLORS['gold']),text('limit',23,COLORS['gold']).next_to(a.c2p(len(vals)+.8,v['limit']),UP,buff=.12))
    elif kind=='field':
        g,a=axes([-3,3],[-3,3],6,6);mode=v['mode']
        for x in np.linspace(-2.5,2.5,7):
            for y in np.linspace(-2.5,2.5,7):
                u=np.array([x,y]) if mode=='radial' else np.array([-y,x]) if mode=='rotation' else np.array([1,0])
                norm=np.linalg.norm(u)
                if norm<.01:continue
                u=u/norm*min(.5,norm*.22)
                g.add(Arrow(a.c2p(x,y),a.c2p(x+u[0],y+u[1]),buff=0,color=COLORS['blue'],stroke_width=1.6,max_tip_length_to_length_ratio=.28))
        if v.get('path')=='circle':motion=Circle(2,color=COLORS['gold'],stroke_width=3);g.add(motion)
        elif v.get('path')=='line':motion=Line(a.c2p(-2,0),a.c2p(2,0),color=COLORS['gold'],stroke_width=3);g.add(motion)
    elif kind=='surface':
        mode=v['mode'];f=lambda x,y:x*x+y*y if mode=='paraboloid' else x+y if mode=='plane' else x*x-y*y
        project=lambda x,y,z:p(1.1*x+.6*y,.37*y+.36*z)
        for axis in range(2):
            for fixed in np.linspace(-2,2,13):
                points=[project(q,fixed,f(q,fixed)) if axis==0 else project(fixed,q,f(fixed,q)) for q in np.linspace(-2,2,36)]
                g.add(VMobject(color=COLORS['blue'],stroke_width=1.2,stroke_opacity=.75).set_points_as_corners(points))
        if v.get('slice'):
            alongx=v['slice']=='x';points=[project(q,0,f(q,0)) if alongx else project(0,q,f(0,q)) for q in np.linspace(-2,2,70)]
            motion=VMobject(color=COLORS['gold'],stroke_width=4).set_points_as_corners(points);g.add(motion)
        for end,label in [(project(2.7,0,0),'x'),(project(0,2.7,0),'y'),(project(0,0,8),'z')]:g.add(Arrow(ORIGIN,end,buff=0,color=DIM,stroke_width=1.3),text(label,25).next_to(end,UP,buff=.1))
    elif kind=='tiles':
        a,b=v['a'],v['b'];side=a+b;s=4.8/side
        labels=v.get('labels',['a^2','a b','a b','b^2'])
        for x,y,w,h,label,c in [(0,b,a,a,labels[0],'blue'),(a,b,b,a,labels[1],'gold'),(0,0,a,b,labels[2],'gold'),(a,0,b,b,labels[3],'pink')]:
            q=Rectangle(width=w*s,height=h*s,color=col(c),fill_opacity=.22,stroke_width=2).move_to(p((x+w/2-side/2)*s,(y+h/2-side/2)*s))
            lab=formula(label,35,col(c));lab.scale_to_fit_width(min(lab.width,w*s*.7));lab.move_to(q);g.add(q,lab)
    else:
        raise ValueError('Unknown visual '+kind)
    return g,motion


class CatalogScene(Scene):
    lesson_path=None

    def construct(self):
        folder=self.lesson_path
        meta=json.loads((folder/'lesson.json').read_text(encoding='utf-8'))
        beats=json.loads((folder/'timings.json').read_text(encoding='utf-8'))
        left=text(meta['course'].upper(),18,DIM).to_corner(UL,buff=.34)
        if left.width>11:left.scale_to_fit_width(11).to_corner(UL,buff=.34)
        right=text(f"LESSON {meta['index']:02d} / {meta['total']:02d}",18,DIM).to_corner(UR,buff=.34)
        self.add(left,right)
        previous=None;eq=None;cues=[]
        for i,beat in enumerate(beats):
            start=self.time
            self.add_sound(str(folder/beat['audio']))
            neweq=formula(beat['formula'],45)
            if neweq.width>13.4:neweq.scale_to_fit_width(13.4)
            if neweq.height>1.05:neweq.scale_to_fit_height(1.05)
            neweq.move_to(UP*3.0)
            diagram,motion=draw(beat['visual'])
            if diagram.width>12.8:diagram.scale_to_fit_width(12.8)
            if diagram.height>5.55:diagram.scale_to_fit_height(5.55)
            diagram.move_to(DOWN*.5)
            if previous is None:
                self.play(LaggedStart(*[FadeIn(m,shift=UP*.035) for m in diagram],lag_ratio=.025),Write(neweq),run_time=2.0)
            else:
                self.play(ReplacementTransform(previous,diagram),TransformMatchingShapes(eq,neweq),run_time=2.0)
            if motion is not None and motion.get_arc_length()>.01:
                self.wait(1.2)
                cursor=Dot(motion.get_start(),color=WHITE,radius=.072)
                self.add(cursor)
                self.play(MoveAlongPath(cursor,motion),run_time=3.6,rate_func=linear)
                self.play(FadeOut(cursor),run_time=.3)
            # A second highlight calls attention to the transformed equation while
            # the narrator explains the justification; it is not decorative motion.
            self.wait(.6)
            self.play(Indicate(neweq,color=COLORS['gold'],scale_factor=1.018),run_time=1)
            remaining=beat['duration']-(self.time-start)
            if remaining<-.01:raise ValueError(f'Cue overrun {meta["id"]} {i}: {remaining}')
            self.wait(max(0,remaining))
            cues.append({'beat':i+1,'start':start,'duration':self.time-start,
                         'formula':beat['formula'],'visual':beat['visual']['kind'],
                         'bounds':[float(diagram.get_left()[0]),float(diagram.get_right()[0]),float(diagram.get_bottom()[1]),float(diagram.get_top()[1])]})
            previous=diagram;eq=neweq
        (folder/'render_cues.json').write_text(json.dumps(cues,indent=2)+'\n',encoding='utf-8')
