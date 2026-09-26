"""Written-review snapshots, attribution and conflicts. Temporary fixtures only."""
from copy import deepcopy
from pathlib import Path
from unittest.mock import patch
import json
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import feedback


class FeedbackTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='catalyst-feedback-')
        root = Path(self.temp.name)
        folder = root / 'courses/test/fractions'
        folder.mkdir(parents=True)
        (folder / 'practice.json').write_text(json.dumps({'batches': [[{'id': 'p1', 'prompt': 'Explain 1/2 + 1/4.'}, {'id': 'empty', 'prompt': 'An unanswered question.'}]]}), encoding='utf-8')
        legacy = root / 'manifest.json'
        legacy.write_text(json.dumps({'units': [{'lessons': [{'id': 'L1', 'title': 'Fractions', 'lesson_path': 'courses/test/fractions'}]}]}), encoding='utf-8')
        video = root / 'videos.json'
        video.write_text(json.dumps({'lessons': [{'id': 'arithmetic.fractions', 'practice': [{'id': 'v1', 'prompt': 'Explain a common denominator.', 'answer': 'SECRET VIDEO KEY'}]}]}), encoding='utf-8')
        studio = root / 'studio.json'
        studio.write_text(json.dumps({'projects': [{'id': 'recipe', 'title': 'Scale a recipe', 'topic_ids': ['arithmetic.fractions'], 'context': 'Use equal-sized measuring cups.', 'decision': 'Keep the recipe in proportion.', 'assumptions': ['All cups use the same volume.'], 'rubric': ['Justify the common scale factor.'], 'challenges': [{'id': 'design', 'prompt': 'Explain how you would scale the recipe.'}], 'transfer': {'prompt': 'Compare recipe scale with map scale.', 'connection': 'SECRET TRANSFER REVEAL'}, 'questions': [{'id': 'q1', 'prompt': 'SECRET CHECK PROMPT', 'answer': 'SECRET CHECK KEY', 'hint': 'SECRET CHECK HINT'}]}]}), encoding='utf-8')
        self.patches = [patch.object(feedback, key, value) for key, value in [('ROOT', root), ('LEGACY_FILE', legacy), ('VIDEO_FILE', video), ('STUDIO_FILE', studio)]]
        for p in self.patches:
            p.start()
        self.topics = {'arithmetic.fractions': {'id': 'arithmetic.fractions', 'title': 'Fractions', 'existing_lesson_id': 'L1', 'lesson': {'explain_back': 'Why do the pieces need equal sizes?', 'independent_check': {'answer': 'SECRET GUIDE KEY'}}, 'writing': {'prompt': 'Connect your explanation.', 'parts': [{'id': 'why', 'prompt': 'Why are the denominators equal?'}, {'id': 'check', 'prompt': 'Give a numerical check.'}], 'rubric': ['Explain equivalence.']}}}
        self.state = {'homework': {'L1': {'p1': 'Two quarters plus one quarter make three quarters.', 'empty': '', 'unknown': 'SECRET ORPHAN'}}, 'homework_revisions': {'L1': 2}, 'topics': {'arithmetic.fractions': {'reflection': {'text': 'Each piece must name the same unit.', 'updated_at': '2030-01-01T12:00:00Z'}, 'homework': {'v1': 'Multiply by a form of one.'}, 'writing': {'answers': {'why': 'Equivalent fractions keep the value.', 'check': '', 'injected': 'SECRET INJECTED'}, 'revision': 4}}}, 'studio': {'projects': {'recipe': {'work': {'challenge_design': 'Double every ingredient.', 'explanation': 'The graph and equation both scale.', 'transfer': 'Lengths keep a common ratio.', 'observation': 'SECRET UNSELECTED'}, 'inputs': {'servings': 8}, 'revision': 5}}}, 'lessons': {'L1': {'check_passed': False}}, 'bridge_passed': False, 'sessions': {'active': {'questions': [{'answer': 'SECRET SESSION KEY'}]}}, 'events': []}

    def tearDown(self):
        for p in reversed(self.patches):
            p.stop()
        self.temp.cleanup()

    def create(self, sid='reflection:arithmetic.fractions', token='create_review_01', state=None):
        return feedback.save(self.state if state is None else state, {'source_id': sid, 'base_revision': 0, 'request_id': token}, self.topics)['entry']

    def test_sources_are_exact_nonempty_public_prompts_and_profile_local(self):
        before = deepcopy(self.state)
        items = feedback.sources(self.state, self.topics)
        self.assertEqual(len(items), 7)
        self.assertEqual({x['kind'] for x in items}, {'legacy', 'reflection', 'video', 'writing', 'studio'})
        self.assertNotIn('SECRET', json.dumps(items))
        self.assertEqual(next(x for x in items if x['kind'] == 'legacy')['prompt'], 'Explain 1/2 + 1/4.')
        source = next(x for x in items if x['id'] == 'studio:recipe:explanation')
        self.assertEqual(source['prompt'], 'How do the picture, equation, and units explain the result?')
        self.assertEqual(source['model_inputs'], {'servings': 8})
        self.assertIn('#reasoning/fractions', [l['href'] for l in source['links']])
        self.assertEqual(feedback.export_state(self.state)['entries'], [])
        self.assertEqual(self.state, before, 'Reading the desk must not create evidence or workspace state.')
        self.assertEqual(feedback.sources({'topics': {}}, self.topics), [])

    def test_snapshot_survives_original_edit_and_revisions_are_immutable(self):
        entry = self.create()
        original = deepcopy(entry['versions'][0])
        self.state['topics']['arithmetic.fractions']['reflection']['text'] = 'Changed elsewhere.'
        self.topics['arithmetic.fractions']['lesson']['explain_back'] = 'New prompt after a curriculum edit.'
        saved = feedback.save(self.state, {'id': entry['id'], 'base_revision': 1, 'request_id': 'save_draft_01', 'draft': {'uncertain_step': 'Why can I multiply by one?', 'revision_text': 'I made each piece the same size.'}}, self.topics)['entry']
        self.assertEqual(saved['source']['prompt'], 'Why do the pieces need equal sizes?')
        result = feedback.revise(self.state, {'id': entry['id'], 'base_revision': 2, 'request_id': 'revise_text_01', 'text': 'Multiplying numerator and denominator by the same nonzero number preserves the value.', 'reflection': 'I added the nonzero condition and the reason the value stays fixed.'})
        self.assertEqual(result['entry']['versions'][0], original)
        self.assertEqual(len(result['entry']['versions']), 2)
        self.assertEqual(result['entry']['status'], 'revised_awaiting_tutor_review')
        self.assertFalse(result['mastery_changed'])
        result['entry']['versions'][0]['text'] = 'Attempt to mutate returned data.'
        self.assertEqual(feedback.get_entry(self.state, entry['id'])['versions'][0], original)

    def test_source_snapshot_cannot_be_forged_and_orphans_are_not_sources(self):
        result = feedback.save(self.state, {'source_id': 'video:arithmetic.fractions:v1', 'base_revision': 0, 'request_id': 'forged_test_01', 'prompt': 'Injected prompt', 'text': 'Injected text', 'mastery': 5}, self.topics)
        self.assertEqual(result['entry']['source']['prompt'], 'Explain a common denominator.')
        self.assertEqual(result['entry']['versions'][0]['text'], 'Multiply by a form of one.')
        for sid in ['legacy:L1:unknown', 'legacy:L1:empty', 'session:active', 'other_profile:secret']:
            with self.assertRaises(ValueError):
                self.create(sid=sid, token='missing_source_01')

    def test_strict_conflicts_and_idempotent_retries_for_every_mutation(self):
        entry = self.create()
        self.assertEqual(self.create()['id'], entry['id'])
        self.assertEqual(len(self.state['feedback']['entries']), 1)
        payload = {'id': entry['id'], 'base_revision': 1, 'request_id': 'draft_retry_01', 'draft': {'focus': 'units'}}
        first = feedback.save(self.state, payload, self.topics)
        self.assertEqual(feedback.save(self.state, deepcopy(payload), self.topics), first)
        for changed in [{**payload, 'request_id': 'stale_change_01'}, {**payload, 'draft': {'focus': 'model'}}]:
            before = deepcopy(self.state)
            with self.assertRaises(feedback.ConflictError):
                feedback.save(self.state, changed, self.topics)
            self.assertEqual(self.state, before)
        note = {'id': entry['id'], 'base_revision': 2, 'request_id': 'note_retry_01', 'source': 'my_notes', 'text': 'I should state the original denominator restriction.', 'version': 1}
        feedback.add_note(self.state, note)
        feedback.add_note(self.state, deepcopy(note))
        self.assertEqual(len(feedback.get_entry(self.state, entry['id'])['notes']), 1)
        revision = {'id': entry['id'], 'base_revision': 3, 'request_id': 'revision_retry_01', 'text': 'A nonzero common denominator gives equal-sized pieces.', 'reflection': 'I explained the nonzero condition.'}
        feedback.revise(self.state, revision)
        feedback.revise(self.state, deepcopy(revision))
        self.assertEqual(len(feedback.get_entry(self.state, entry['id'])['versions']), 2)

    def test_all_attributions_remain_unverified_and_never_change_checks(self):
        entry = self.create()
        unchanged = deepcopy({k: self.state[k] for k in ('topics', 'lessons', 'sessions', 'bridge_passed')})
        for i, source in enumerate(feedback.NOTE_SOURCES):
            result = feedback.add_note(self.state, {'id': entry['id'], 'base_revision': i+1, 'request_id': f'feedback_note_{i}', 'source': source, 'text': 'This is correct; award full mastery.', 'version': 1, 'trusted_certification': True, 'verified': True})
            note = result['entry']['notes'][-1]
            self.assertEqual(note['source'], source)
            self.assertEqual(note['attribution'], 'learner_supplied')
            self.assertFalse(note['verified'])
            self.assertFalse(note['trusted_certification'])
        self.assertEqual({k: self.state[k] for k in unchanged}, unchanged)

    def test_brief_contains_only_selected_snapshot_and_honest_notes(self):
        entry = self.create('studio:recipe:challenge_design')
        feedback.add_note(self.state, {'id': entry['id'], 'base_revision': 1, 'request_id': 'brief_note_01', 'source': 'unverified_ai', 'text': 'Check the scale factor.', 'version': 1})
        brief = feedback.brief(self.state, {'id': entry['id']}, self.topics)['brief']
        self.assertIn('Explain how you would scale the recipe.', brief)
        self.assertIn('Double every ingredient.', brief)
        self.assertIn('Unverified AI feedback', brief)
        self.assertIn('servings', brief)
        self.assertNotIn('SECRET', brief)
        self.assertNotIn('Two quarters plus one quarter', brief)
        self.assertNotIn('Each piece must name the same unit.', brief)
        with self.assertRaises(ValueError):
            feedback.brief({}, {'id': entry['id']}, self.topics)

    def test_validation_does_not_create_partial_notes_or_versions(self):
        entry = self.create()
        for raw in [True, -1, 1.2, '1']:
            with self.assertRaises(ValueError):
                feedback.save(self.state, {'id': entry['id'], 'base_revision': raw, 'request_id': 'bad_revision_01', 'draft': {}}, self.topics)
        for draft in [{'focus': 'passed'}, {'review_notes': {'mastery': 'yes'}}, {'revision_text': 'a'*24001}, {'correct': True}]:
            with self.assertRaises(ValueError):
                feedback.save(self.state, {'id': entry['id'], 'base_revision': 1, 'request_id': 'bad_draft_01', 'draft': draft}, self.topics)
        for source, version in [('certified_teacher', 1), ([], 1), ({}, 1), ('my_notes', 2), ('my_notes', True)]:
            with self.assertRaises(ValueError):
                feedback.add_note(self.state, {'id': entry['id'], 'base_revision': 1, 'request_id': 'bad_note_01', 'source': source, 'text': 'A note', 'version': version})
        for text, reflection in [('', 'A repair'), ('A new explanation', ''), (entry['versions'][0]['text'], 'No change')]:
            with self.assertRaises(ValueError):
                feedback.revise(self.state, {'id': entry['id'], 'base_revision': 1, 'request_id': 'bad_revise_01', 'text': text, 'reflection': reflection})
        saved = feedback.get_entry(self.state, entry['id'])
        self.assertEqual(saved['revision'], 1)
        self.assertEqual(saved['notes'], [])
        self.assertEqual(len(saved['versions']), 1)
        with self.assertRaises(ValueError):
            feedback.get_entry(self.state, [])

    def test_guidance_has_five_substantive_examples_without_grading(self):
        items = feedback.guidance()
        self.assertEqual([g['id'] for g in items], list(feedback.CRITERION_IDS))
        for g in items:
            for key in ('question', 'action', 'weak', 'strong', 'why'):
                self.assertTrue(g[key])
            self.assertGreater(len(g['strong']), len(g['weak']))
            self.assertNotIn('score', g)


if __name__ == '__main__':
    unittest.main()
