"""Local learner selection, not authentication for an Internet-facing service.

Opaque browser cookies select independent records. No learner's evidence is used as
a template, and the original profile stays in its existing directory.
"""
from pathlib import Path
import importlib.util
import json
import os
import re
import secrets


class ProfileStore:
    cookie_name = 'catalyst_learner'

    def __init__(self, root, original_dir, default_id='original', isolated=False):
        self.root = Path(root)
        self.original_dir = Path(original_dir)
        self.profile_root = self.original_dir / 'local_profiles' if isolated else self.root
        self.profiles_dir = self.profile_root / 'students'
        self.default_id = default_id
        self.sessions = {}
        self.session_file = self.original_dir / 'dashboard_browser_sessions.json'
        if self.session_file.is_file():
            try:
                tokens = json.loads(self.session_file.read_text(encoding='utf-8'))
                if isinstance(tokens, dict):
                    self.sessions = {token: identity for token, identity in tokens.items() if re.fullmatch(r'[A-Za-z0-9_-]{43}', token) and isinstance(identity, str)}
            except (OSError, ValueError, TypeError):
                pass
        self.states = {}
        helper = self.root / 'tools/new_student.py'
        spec = importlib.util.spec_from_file_location('catalyst_new_student', helper)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        self.create_empty_profile = module.create_profile
        self.path(default_id)  # Fail at startup if a requested learner does not exist.

    @staticmethod
    def validate_id(profile_id):
        if not isinstance(profile_id, str) or not re.fullmatch(r'[a-z][a-z0-9_-]{0,39}', profile_id):
            raise ValueError('Use a short lowercase learner ID starting with a letter.')
        reserved = {'con', 'prn', 'aux', 'nul', *(f'com{i}' for i in range(10)), *(f'lpt{i}' for i in range(10))}
        if profile_id in reserved:
            raise ValueError('That learner ID is reserved by Windows.')
        return profile_id

    def path(self, profile_id):
        self.validate_id(profile_id)
        if profile_id == 'original':
            return self.original_dir
        base = self.profiles_dir.resolve()
        target = (base / profile_id / 'student').resolve()
        if not target.is_relative_to(base) or not target.is_dir():
            raise ValueError('That learner profile does not exist.')
        return target

    def descriptor(self, profile_id):
        self.path(profile_id)
        name = 'Original learner' if profile_id == 'original' else profile_id
        metadata = self.profiles_dir / profile_id / 'profile.json'
        if profile_id != 'original' and metadata.is_file():
            try:
                name = str(json.loads(metadata.read_text(encoding='utf-8')).get('name', name))[:60]
            except (OSError, ValueError, TypeError):
                pass
        return {'id': profile_id, 'name': name}

    def list_profiles(self):
        profiles = [self.descriptor('original')]
        if self.profiles_dir.is_dir():
            for candidate in sorted(self.profiles_dir.iterdir()):
                if candidate.name == 'original':
                    continue
                try:
                    profiles.append(self.descriptor(candidate.name))
                except ValueError:
                    continue
        return profiles

    def resolve(self, token):
        if token in self.sessions:
            try:
                self.path(self.sessions[token])
                return token, self.sessions[token], False
            except ValueError:
                self.sessions.pop(token)
        token = secrets.token_urlsafe(32)
        self.sessions[token] = self.default_id
        self.save_sessions()
        return token, self.default_id, True

    def save_sessions(self):
        # Session tokens are private runtime state, never curriculum or exported evidence.
        self.sessions = dict(list(self.sessions.items())[-1000:])
        temporary = self.session_file.with_suffix('.tmp')
        temporary.write_text(json.dumps(self.sessions, indent=2) + '\n', encoding='utf-8')
        os.replace(temporary, self.session_file)

    def select(self, token, profile_id):
        self.path(profile_id)
        # Rotate on selection so concurrent old requests cannot change this selection.
        new_token = secrets.token_urlsafe(32)
        self.sessions[new_token] = profile_id
        self.save_sessions()
        return new_token

    def create(self, profile_id, name):
        self.validate_id(profile_id)
        if profile_id == 'original':
            raise ValueError('The original learner is already present.')
        if not isinstance(name, str) or not 1 <= len(name.strip()) <= 60 or any(ord(c) < 32 for c in name):
            raise ValueError('Use a display name of 1–60 characters.')
        try:
            target = self.create_empty_profile(self.profile_root, profile_id)
        except FileExistsError:
            raise ValueError('That learner ID is already in use.') from None
        (target / 'profile.json').write_text(json.dumps({'id': profile_id, 'name': name.strip()}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        return self.descriptor(profile_id)

    def load(self, profile_id, empty, normalize):
        if profile_id not in self.states:
            file = self.path(profile_id) / 'dashboard_progress.json'
            state = json.loads(file.read_text(encoding='utf-8')) if file.exists() else empty()
            self.states[profile_id] = normalize(state)
        return self.states[profile_id]
