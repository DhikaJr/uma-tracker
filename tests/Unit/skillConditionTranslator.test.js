import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { translateClause, translateConditionString } from '../../resources/js/utils/skillConditionTranslator.js';

const fixture = JSON.parse(readFileSync(new URL('../Fixtures/skill-condition-regressions.json', import.meta.url), 'utf8'));

for (const { formula, text, note } of fixture.clauses) {
    test(`translates ${formula}`, () => {
        const condition = translateClause(formula);

        assert.equal(condition.raw, formula);
        if (text) assert.equal(condition.text, text);
        if (note) assert.ok(condition.note.includes(note), condition.note);
    });
}

for (const { name, formula, branches } of fixture.preconditions) {
    test(`preserves separate precondition options for ${name}`, () => {
        const result = translateConditionString(formula);

        assert.equal(result.hasAlternatives, true);
        assert.deepEqual(result.branches.map(branch => branch.conditions.map(condition => condition.raw)), branches);
    });
}
