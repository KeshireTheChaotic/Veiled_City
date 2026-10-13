#!/usr/bin/env python3
"""Fast, isolated reporter smoke test. Does not execute real Veiled City suites."""
from __future__ import annotations
import argparse
import json
import pathlib
import re
import shutil
import subprocess
import tempfile


def main(repo: pathlib.Path) -> None:
    src = repo / 'bot/scripts/validate-offline.mjs'
    if not src.exists():
        raise SystemExit('Expected bot/scripts/validate-offline.mjs in --repo')
    patched = src.read_text(encoding='utf-8')
    if 'VC_VALIDATION_REPORT_V1' not in patched:
        raise SystemExit('First apply reporter to checkout (or to a temporary copy).')
    with tempfile.TemporaryDirectory(prefix='vc-report-smoke-') as location:
        root = pathlib.Path(location)
        scripts = root / 'bot/scripts'
        (scripts / 'fixtures').mkdir(parents=True)
        (root/'bot/package.json').write_text('{"type":"module"}',encoding='utf-8')
        (scripts / 'offline-guard.mjs').write_text('// deliberately inert in isolated smoke run\n',encoding='utf-8')
        (scripts / 'pass.mjs').write_text('console.log("PASS_OUTPUT_MUST_NOT_APPEAR")\n',encoding='utf-8')
        (scripts / 'fail.mjs').write_text('console.error("intentional report failure: sk-proj-VERYSECRETTESTTOKEN1234567");process.exit(7);\n',encoding='utf-8')
        runner=scripts/'validate-offline.mjs'
        pattern=r'const suites=([\s\S]*?);\s*const report='
        assert len(re.findall(pattern,patched))==1, 'Unknown suite registry form: test manually'

        def run(names, required):
            synthetic=re.sub(pattern,'const suites='+json.dumps(names)+';\nconst report=',patched,count=1)
            runner.write_text(synthetic,encoding='utf-8')
            (scripts/'fixtures/i-heard-you-acceptance.json').write_text(json.dumps([{'id':'smoke','suites':required}]),encoding='utf-8')
            run=subprocess.run(['node','scripts/validate-offline.mjs'],cwd=root/'bot',text=True,capture_output=True)
            report=json.loads((root/'bot/.reports/offline-validation.json').read_text(encoding='utf-8'))
            return run,report

        run1,r1=run(['pass','fail','never'],['pass'])
        assert run1.returncode==7,(run1.stderr,r1)
        assert r1['summary']['status']=='failed' and [s['status'] for s in r1['suites']]==['passed','failed','not_run']
        assert r1['suites'][0]['duration_ms']>=0 and r1['suites'][1]['exit_code']==7
        assert 'VERYSECRETTESTTOKEN' not in json.dumps(r1), 'Credential-shaped text leaked into JSON diagnostics'
        assert 'PASS_OUTPUT_MUST_NOT_APPEAR' not in run1.stdout+run1.stderr, 'Passing TAP/log output was printed'

        run2,r2=run(['pass'],['pass'])
        assert run2.returncode==0,(run2.stdout,run2.stderr,r2)
        assert r2['summary']['status']=='passed' and r2['summary']['passed']==1
        assert r2['suites'][0]['failure'] is None
        assert 'PASS_OUTPUT_MUST_NOT_APPEAR' not in run2.stdout+run2.stderr

        run3,r3=run(['pass'],['not-registered'])
        assert run3.returncode!=0 and r3['summary']['status']=='failed'
        assert r3.get('acceptance_failures')==['smoke']

        print('REPORTER SMOKE PASS: failure, not-run, secret redaction, muted passing output, success and acceptance failures (isolated 3 synthetic cases).')

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--repo',required=True,type=pathlib.Path)
    a=p.parse_args()
    main(a.repo.resolve())
