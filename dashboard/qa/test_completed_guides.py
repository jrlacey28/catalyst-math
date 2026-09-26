"""Complete coverage, finite fresh banks, conditions, and independent math samples."""
from pathlib import Path
from collections import Counter
from fractions import Fraction
from itertools import combinations,product
import json,math,sys,unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import server
from question_bank import grade,public
from review_bank import normalize_text
ROOT=Path(__file__).resolve().parents[1]
FOUNDATION=json.loads((ROOT/'completed-guides-foundations.json').read_text(encoding='utf-8'))['topics']
COLLEGE=json.loads((ROOT/'completed-guides-college.json').read_text(encoding='utf-8'))['topics']
SCAFFOLDS=json.loads((ROOT/'legacy-scaffolds.json').read_text(encoding='utf-8'))['topics']

class CompletedGuides(unittest.TestCase):
    def test_all_topics_have_practice_checks_and_worked_guidance(self):
        topics=server.topic_index();self.assertEqual(len(topics),159)
        self.assertEqual(len(FOUNDATION),43);self.assertEqual(len(COLLEGE),42)
        self.assertEqual(sum(bool(t.get('lesson')) for t in topics.values()),137)
        self.assertEqual(len(SCAFFOLDS),22)
        for tid,t in topics.items():
            self.assertTrue(t.get('lesson') or t.get('existing_lesson_id'),tid)
            guide=t.get('lesson') or t.get('scaffold');self.assertTrue(guide,tid)
            self.assertGreaterEqual(len(guide['examples']),1,tid)
        legacy={tid for tid,t in topics.items() if t.get('existing_lesson_id') and not t.get('lesson')}
        self.assertEqual(legacy,{t['id'] for t in SCAFFOLDS})
    def test_original_banks_are_complete_and_self_contained(self):
        ids=set();count=0
        for t in FOUNDATION+COLLEGE:
            lesson=t['lesson'];self.assertEqual(len(lesson['examples']),2,t['id'])
            for ex in lesson['examples']:
                self.assertGreaterEqual(len(ex['steps']),3,t['id'])
                self.assertTrue(all(s['expression'].strip() and len(s['reason'])>15 for s in ex['steps']),t['id'])
            prompts=[]
            for name in ('practice','independent_check'):
                bank=lesson[name];self.assertEqual(len(bank),9,t['id'])
                self.assertEqual(Counter(q['difficulty'] for q in bank),{'gentle':3,'standard':3,'stretch':3},t['id'])
                for q in bank:
                    self.assertNotIn(q['id'],ids);ids.add(q['id']);count+=1
                    prompts.append(normalize_text(q['prompt']))
                    self.assertGreater(len(q['explanation']),10,q['id']);self.assertTrue(grade(q,str(q['answer'])),q['id'])
                    self.assertFalse({'answer','hint','explanation'}&public(q).keys())
                    if q['kind']=='choice':
                        self.assertEqual(len(q['options']),len(set(q['options'])),q['id'])
                        self.assertEqual(q['options'].count(q['answer']),1,q['id'])
                        for option in q['options']:
                            if option!=q['answer']:self.assertFalse(grade(q,option),q['id'])
                    else:self.assertTrue(math.isfinite(float(q['answer'])),q['id'])
                    self.assertNotIn('For the same matrix',q['prompt'])
            self.assertEqual(len(prompts),len(set(prompts)),t['id'])
            self.assertEqual(len(t['writing']['parts']),3);self.assertGreaterEqual(len(t['writing']['rubric']),3)
            for connection in t['connections']:self.assertIn(connection['topic_id'],server.topic_index())
        self.assertEqual(count,1530)
    def test_each_college_final_numeric_question_recomputed(self):
        # Independent arithmetic/enumeration samples; this does not certify proofs.
        expected={
            'statistics.regression':sum(x*x for x in (1,-2,1)),
            'statistics.confidence-intervals':(11-3)/2,
            'statistics.statistical-inference':abs(Fraction(30,50)-Fraction(15,50)),
            'proof-foundations.relations-functions':math.factorial(4),
            'real-analysis.real-numbers':-3*(-2)+1,
            'real-analysis.continuity-differentiation':4/2,
            'real-analysis.integration':Fraction(3,20),
            'complex-analysis.contour-integrals':2*2,
            'complex-analysis.power-series-residues':1,
            'abstract-algebra.rings':len(set(n%9 for n in range(30))),
            'abstract-algebra.fields':1-2,
            'number-theory.divisibility':sum(10//2**k for k in range(1,5)),
            'number-theory.diophantine-equations':sum(x*x+y*y==3 for x,y in product(range(-2,3),repeat=2)),
            'differential-equations.pdes':math.sqrt(25),
            'optimization.convexity':0,
            'optimization.unconstrained':1-1.5*2,
            'optimization.constrained':2*(10/2),
            'numerical-analysis.error-stability':Fraction(1,2),
            'numerical-analysis.root-finding':next(n for n in range(20) if Fraction(1,2**n)<=Fraction(1,32)),
            'numerical-analysis.approximation-integration':(Fraction(21,10)**2-Fraction(19,10)**2)/Fraction(2,10),
            'numerical-analysis.linear-ode-methods':1/(1+2*.5),
            'topology.metric-topological-spaces':2,
            'topology.quotient-product-spaces':2**(2*3),
            'differential-geometry.curves-surfaces':math.sqrt(1+2**2),
            'differential-geometry.manifolds':2*(-1)-1*1,
            'differential-geometry.curvature-geodesics':math.sqrt(4),
            'probability.counting':sum(sum(bits)==2 for bits in product((0,1),repeat=5))/2**5,
            'probability.conditional-probability':Fraction(8,10)*Fraction(1,4),
            'probability.bayes-theorem':(.25*.6)/(.25*.6+.75*.2),
            'probability.random-variables':sum(prob for x,prob in ((1,.1),(2,.4),(4,.5)) if x<=3),
            'probability.distributions':12*.5*(1-.5),
            'probability.expectation':2+3+2*1,
            'statistics.sampling':len({sum(pair)/2 for pair in combinations((1,3,5),2)}),
            'statistics.estimation':2+(7-8)**2,
            'statistics.hypothesis-testing':10*.01,
            'measure-theory.lebesgue-integration':0,
            'measure-theory.lp-spaces':1/(1-Fraction(1,4)),
            'stochastic-processes.markov-chains':Fraction(1,10)/(Fraction(4,10)+Fraction(1,10)),
            'stochastic-processes.poisson-renewal':Fraction(1,4),
            'stochastic-processes.martingales-brownian':2**2*3,
            'functional-analysis.operators-duality':abs(-3)*4,
            'functional-analysis.spectral-theory':0,
        }
        for t in COLLEGE:
            q=[q for q in t['lesson']['independent_check'] if q['kind']=='number'][-1]
            self.assertAlmostEqual(float(q['answer']),float(expected[t['id']]),places=8,msg=q['prompt'])
    def test_advanced_guides_keep_theorem_conditions_and_proof_review(self):
        allrows={t['id']:t for t in COLLEGE}
        for tid,terms in {
            'stochastic-processes.markov-chains':['irreducible','aperiodic'],
            'stochastic-processes.martingales-brownian':['integrable','filtration','stopping'],
            'measure-theory.lebesgue-integration':['measurable','dominat'],
            'measure-theory.lp-spaces':['almost everywhere','finite measure'],
            'functional-analysis.spectral-theory':['compact','self-adjoint','kernel'],
            'functional-analysis.operators-duality':['norm','domain','bounded'],
        }.items():
            prose=json.dumps(allrows[tid],ensure_ascii=False).lower()
            for term in terms:self.assertIn(term,prose)
            self.assertIn('pending tutor review',allrows[tid]['writing']['prompt'])
    def test_legacy_examples_are_written_guidance_not_new_assessments(self):
        for t in SCAFFOLDS:
            self.assertEqual(len(t['examples']),2,t['id']);self.assertTrue(t['intuition'] and t['misconception'])
            self.assertFalse({'practice','independent_check','answer'}&t.keys())
            for ex in t['examples']:
                self.assertGreaterEqual(len(ex['steps']),3)
                self.assertTrue(all(s['expression'] and s['reason'] for s in ex['steps']))

if __name__=='__main__':unittest.main()
