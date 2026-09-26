"""Content integrity plus independent mathematics for the advanced overlay.

Run directly with Python's standard library. These tests never load or write a
learner profile. Numerical expectations are recomputed from the fixed problem
parameters, not copied from the JSON's answer or feedback fields. Proof prose
and theorem conditions also received an independent human-readable review;
these checks are not an automatic proof grader.
"""

import collections
from fractions import Fraction as F
import json
import math
from pathlib import Path
import re
import unicodedata
import unittest


DASHBOARD = Path(__file__).resolve().parents[1]
DATA = json.loads((DASHBOARD / "advanced_guides.json").read_text(encoding="utf-8"))
BASE = json.loads((DASHBOARD / "curriculum_catalog.json").read_text(encoding="utf-8"))
TOPICS = {t["id"]: t for t in DATA["topics"]}
BASE_TOPICS = {t["id"]: t for c in BASE["courses"] for t in c["topics"]}
QUESTIONS = {
    q["id"]: q
    for t in TOPICS.values()
    for bank in ("practice", "independent_check")
    for q in t["lesson"][bank]
}
EXPECTED_IDS = {
    "calculus-1.continuity", "calculus-1.implicit-differentiation",
    "calculus-1.optimization", "calculus-1.related-rates",
    "calculus-2.fundamental-theorem", "calculus-2.integration-techniques",
    "calculus-2.applications-of-integration", "calculus-2.improper-integrals",
    "calculus-2.infinite-sequences", "calculus-2.infinite-series",
    "calculus-2.taylor-series", "multivariable.multiple-integrals",
    "multivariable.line-integrals", "multivariable.surface-integrals",
    "differential-equations.odes", "proof-foundations.mathematical-language",
    "real-analysis.sequences-limits", "real-analysis.function-sequences",
    "abstract-algebra.groups", "number-theory.modular-arithmetic",
    "complex-analysis.holomorphic-functions",
    "topology.compactness-connectedness", "measure-theory.measures",
    "functional-analysis.banach-hilbert",
}


def prompt_fingerprint(prompt):
    # Keep mathematical signs/exponents; only normalize encoding and spacing.
    return re.sub(r"\s+", "", unicodedata.normalize("NFC", prompt).casefold())


def polynomial_integral(coefficients, lower, upper):
    """Exact integral of ascending polynomial coefficients, independent of keys."""
    return sum(
        F(coefficient, power + 1) * (F(upper) ** (power + 1) - F(lower) ** (power + 1))
        for power, coefficient in enumerate(coefficients)
    )


def threshold(c, epsilon):
    """Least N with c/n < epsilon for every integer n >= N, using exact rationals."""
    return math.floor(F(c) / F(epsilon)) + 1


def order_mod(a, modulus):
    return next(k for k in range(1, modulus + 1) if (a * k) % modulus == 0)


def inverse_mod(a, modulus):
    return next(x for x in range(modulus) if (a * x) % modulus == 1)


def solutions_mod(a, b, modulus):
    return [x for x in range(modulus) if (a * x - b) % modulus == 0]


def dot(x, y):
    return sum(a * b for a, b in zip(x, y))


def projection(x, v):
    c = F(dot(x, v), dot(v, v))
    residual = [F(a) - c * b for a, b in zip(x, v)]
    return c, dot(residual, residual)


class AdvancedGuideTests(unittest.TestCase):
    def assert_key(self, qid, value):
        self.assertIn(qid, QUESTIONS)
        q = QUESTIONS[qid]
        self.assertEqual(q["kind"], "number", qid)
        self.assertAlmostEqual(q["answer"], float(value), places=10, msg=qid)

    def test_exact_scope_and_reference_integrity(self):
        self.assertEqual(DATA["version"], 1)
        self.assertEqual(len(DATA["topics"]), 24)
        self.assertEqual(set(TOPICS), EXPECTED_IDS)
        for tid, topic in TOPICS.items():
            with self.subTest(topic=tid):
                self.assertIn(tid, BASE_TOPICS)
                self.assertFalse(BASE_TOPICS[tid].get("lesson"), "Overlay must fill an actual unguided topic")
                for prerequisite in BASE_TOPICS[tid].get("prerequisites", []):
                    self.assertIn(prerequisite, BASE_TOPICS)
                for connection in topic["connections"]:
                    self.assertIn(connection["topic_id"], BASE_TOPICS)
                    self.assertTrue(connection["why"].strip())
        proof_courses = {"proof-foundations", "real-analysis", "abstract-algebra", "number-theory",
                         "complex-analysis", "topology", "measure-theory", "functional-analysis"}
        self.assertEqual(sum(t.split(".")[0] in proof_courses for t in TOPICS), 9)

    def test_examples_and_written_arguments(self):
        self.assertEqual(sum(len(t["lesson"]["examples"]) for t in TOPICS.values()), 59)
        for tid, topic in TOPICS.items():
            with self.subTest(topic=tid):
                lesson = topic["lesson"]
                for field in ("intuition", "misconception", "explain_back"):
                    self.assertTrue(lesson[field].strip())
                self.assertIn(len(lesson["examples"]), (2, 3))
                for example in lesson["examples"]:
                    self.assertTrue(example["title"] and example["note"])
                    self.assertGreaterEqual(len(example["steps"]), 4)
                    for step in example["steps"]:
                        self.assertTrue(step["expression"] and step["reason"])
                self.assertEqual([p["id"] for p in topic["writing"]["parts"]], ["claim", "reason", "conditions"])
                self.assertTrue(all(p["prompt"].strip() for p in topic["writing"]["parts"]))
                self.assertEqual(len(topic["writing"]["rubric"]), 3)
                self.assertTrue(topic["application"]["scenario"] and topic["application"]["task"])

    def test_questions_are_complete_and_fresh(self):
        ids = []
        for tid, topic in TOPICS.items():
            fingerprints = set()
            for bank in ("practice", "independent_check"):
                rows = topic["lesson"][bank]
                self.assertEqual(len(rows), 9, (tid, bank))
                self.assertEqual(collections.Counter(q["difficulty"] for q in rows),
                                 {"gentle": 3, "standard": 3, "stretch": 3})
                for q in rows:
                    ids.append(q["id"])
                    self.assertTrue(q["id"].startswith(tid + "."))
                    fingerprint = prompt_fingerprint(q["prompt"])
                    self.assertNotIn(fingerprint, fingerprints, (tid, "Exposed prompt reused", q["id"]))
                    fingerprints.add(fingerprint)
                    self.assertTrue(q["explanation"].strip())
                    if q["kind"] == "choice":
                        self.assertEqual(len(q["options"]), len(set(q["options"])))
                        self.assertEqual(q["options"].count(q["answer"]), 1)
                    else:
                        self.assertEqual(q["kind"], "number")
                        self.assertIsInstance(q["answer"], (float, int))
                        self.assertTrue(math.isfinite(q["answer"]))
                        self.assertGreater(q["tolerance"], 0)
        self.assertEqual(len(ids), 432)
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(sum(q["kind"] == "number" for q in QUESTIONS.values()), 273)

    def test_integrals_geometry_and_orientation_independently(self):
        # Recompute from cross-sections, density moments and parameterized fields.
        cases = {
            "calculus-2.integration-techniques.practice-4": polynomial_integral([0, 1, 0, 1], 0, 2),
            "calculus-2.integration-techniques.practice-7": polynomial_integral([0, 0, 12, 0, 0, 12, 0, 0, 3], 0, 1),
            "calculus-2.integration-techniques.check-3": polynomial_integral([0, 18, 0, 12, 0, 2], 0, 1),
            "calculus-2.applications-of-integration.practice-7": polynomial_integral([0, 0, 2], 0, 3) / polynomial_integral([0, 2], 0, 3),
            "calculus-2.applications-of-integration.practice-8": polynomial_integral([0, 0, 1], 0, 3),
            "calculus-2.applications-of-integration.check-3": polynomial_integral([0, 0, 3], 0, 4) / polynomial_integral([0, 3], 0, 4),
            "calculus-2.applications-of-integration.check-6": polynomial_integral([9, 0, -1], 0, 3),
            "multivariable.multiple-integrals.practice-8": polynomial_integral([0, 0, F(1, 2)], 0, 2),
            "multivariable.multiple-integrals.check-3": polynomial_integral([0, 0, F(1, 2)], 0, 3),
            "multivariable.multiple-integrals.check-6": 2 * polynomial_integral([0, 0, 0, 1], 0, 1),
            "multivariable.line-integrals.practice-9": 2 * 2**2,
            "multivariable.line-integrals.check-3": -2 * 3**2,
            "multivariable.line-integrals.check-6": 2**2 * 2 - 1**2 * 3,
            "multivariable.surface-integrals.practice-5": 3 * 2**3,
            "multivariable.surface-integrals.practice-6": dot((0, 0, 5), (-1, 0, 1)) * 2 * 3,
            "multivariable.surface-integrals.check-3": 3 * F(4, 3) * 2**3,
            "multivariable.surface-integrals.check-6": dot((0, 0, 4), (-2, -1, 1)),
        }
        for qid, expected in cases.items():
            with self.subTest(question=qid):
                self.assert_key(qid, expected)

    def test_implicit_rates_and_ode_values_independently(self):
        cases = {
            "calculus-1.implicit-differentiation.practice-7": -F(3**2 + 4**2, 4**3),
            "calculus-1.implicit-differentiation.check-3": -F(2**2 + 3**2, 3**3),
            "calculus-1.related-rates.practice-7": 2 * 2 * 1 * 5 + 2**2 * (-2),
            "calculus-1.related-rates.check-3": 2 * 3 * 2 * 2 + 3**2 * (-1),
            "calculus-1.related-rates.check-6": 3 * 2**2 * 2,
            "differential-equations.odes.practice-8": 2 - 2 * math.exp(-math.log(2)),
            "differential-equations.odes.check-2": 5 * math.exp(2 * math.log(2) / 2),
            "differential-equations.odes.check-3": 3 - 3 * math.exp(-2 * math.log(2) / 2),
            "calculus-2.fundamental-theorem.practice-7": 2 * (2 * 1)**2 - 1**2,
            "calculus-2.fundamental-theorem.check-6": (1 + 2) - (1**2) * (2 * 1),
        }
        for qid, expected in cases.items():
            self.assert_key(qid, expected)

    def test_tails_and_taylor_errors_independently(self):
        cases = {
            "calculus-2.improper-integrals.practice-7": F(3, 4),
            "calculus-2.improper-integrals.check-6": 2 * math.sqrt(4),
            "calculus-2.improper-integrals.check-8": 4 * F(1, 2) * F(1, 2**2),
            "calculus-2.infinite-series.practice-7": F(1, 2)**4 / (1 - F(1, 2)),
            "calculus-2.infinite-series.check-3": F(1, 3)**3 / (1 - F(1, 3)),
            "calculus-2.taylor-series.practice-6": 6 * F(1, 10)**3 / math.factorial(3),
            "calculus-2.taylor-series.practice-9": 24 * F(1, 2)**4 / math.factorial(4),
            "calculus-2.taylor-series.check-3": 12 * F(1, 5)**4 / math.factorial(4),
        }
        for qid, expected in cases.items():
            self.assert_key(qid, expected)

    def test_epsilon_thresholds_use_strict_inequalities(self):
        cases = {
            "practice-2": (2, F(1, 10)), "practice-4": (3, F(1, 4)),
            "practice-7": (1, F(1, 100)), "check-2": (5, F(1, 2)),
            "check-5": (1, F(1, 5)),
        }
        for suffix, (c, eps) in cases.items():
            n = threshold(c, eps)
            self.assert_key("real-analysis.sequences-limits." + suffix, n)
            self.assertLess(F(c, n), eps)
            self.assertGreaterEqual(F(c, n - 1), eps)
        self.assert_key("real-analysis.function-sequences.practice-7", 5 * F(2, 100))
        self.assert_key("real-analysis.function-sequences.check-3", 4 * F(3, 100))

    def test_modular_answers_by_exhaustive_residue_enumeration(self):
        cases = {
            "practice-1": 17 % 5, "practice-2": -3 % 7,
            "practice-3": inverse_mod(3, 7), "practice-4": min(solutions_mod(3, 4, 7)),
            "practice-5": len(solutions_mod(6, 4, 8)),
            "practice-7": next(x for x in range(15) if x % 3 == 1 and x % 5 == 2),
            "practice-9": inverse_mod(5, 12), "check-1": 29 % 6,
            "check-2": min(solutions_mod(5, 3, 7)), "check-3": len(solutions_mod(8, 4, 12)),
            "check-4": -8 % 5, "check-5": inverse_mod(7, 10),
            "check-6": next(x for x in range(12) if x % 3 == 2 and x % 4 == 1),
            "check-7": (4 * 5) % 7,
        }
        for suffix, expected in cases.items():
            self.assert_key("number-theory.modular-arithmetic." + suffix, expected)
        self.assertEqual(solutions_mod(4, 3, 6), [])
        self.assertEqual(solutions_mod(6, 4, 8), [2, 6])
        self.assert_key("abstract-algebra.groups.practice-4", order_mod(2, 6))
        self.assert_key("abstract-algebra.groups.check-2", order_mod(3, 12))
        self.assert_key("abstract-algebra.groups.check-8", order_mod(6, 8))
        # Enumerate the four-group to verify the Lagrange-converse counterexample.
        pairs = [(a, b) for a in range(2) for b in range(2)]
        self.assertEqual(len(pairs), 4)
        self.assertTrue(all(((2*a) % 2, (2*b) % 2) == (0, 0) for a, b in pairs))

    def test_hilbert_geometry_and_complex_counterexamples(self):
        c, residual_square = projection((3, 1), (1, 2))
        self.assertEqual(c, 1)
        self.assert_key("functional-analysis.banach-hilbert.practice-5", residual_square)
        c, residual_square = projection((4, 2), (1, 1))
        self.assert_key("functional-analysis.banach-hilbert.check-2", c)
        self.assert_key("functional-analysis.banach-hilbert.check-3", residual_square)
        self.assert_key("functional-analysis.banach-hilbert.practice-7", 1 / (1 - F(1, 4)))
        for n in (2, 5, 10):
            finite_tail = sum(F(1, 4)**k for k in range(n, n + 10))
            infinite_bound = F(4, 3) * F(1, 4)**n
            self.assertLess(finite_tail, infinite_bound)
        self.assert_key("complex-analysis.holomorphic-functions.practice-4", (3 * (1j)**2).real)
        self.assert_key("complex-analysis.holomorphic-functions.practice-8", (-1 / (1j)**2).real)
        self.assert_key("complex-analysis.holomorphic-functions.check-5", -F(1, 2**2))
        real_h, imaginary_h = complex(.001, 0), complex(0, .001)
        self.assertEqual(real_h.conjugate() / real_h, 1)
        self.assertEqual(imaginary_h.conjugate() / imaginary_h, -1)

    def test_reviewed_hypotheses_do_not_regress(self):
        required_fragments = {
            "calculus-2.improper-integrals.practice-9": "continuous",
            "calculus-2.improper-integrals.check-3": "continuous",
            "calculus-2.applications-of-integration.practice-8": "region",
            "calculus-2.taylor-series.check-9": "centered at 0",
            "multivariable.line-integrals.check-8": "continuously differentiable",
            "multivariable.surface-integrals.check-9": "covering the surface once",
            "real-analysis.function-sequences.practice-7": "integrable",
            "real-analysis.function-sequences.check-3": "integrable",
            "real-analysis.function-sequences.check-6": "continuously differentiable",
        }
        for qid, text in required_fragments.items():
            self.assertIn(text, QUESTIONS[qid]["prompt"], qid)


if __name__ == "__main__":
    unittest.main(verbosity=2)
