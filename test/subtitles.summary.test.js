import {test} from 'node:test'
import assert from 'assert';
import { cleanTranscript } from '../lib/subtitles-summary.js'

test('cleans transcript', () => {
  const transcript = `
1
00:00:01,240 --> 00:00:06,879
<font color="white" size=".72c">when we are about to do something</font>

2
00:00:04,160 --> 00:00:10,519
<font color="white" size=".72c">new</font>

3
00:00:06,879 --> 00:00:14,080
<font color="white" size=".72c">Eh after finishing</font>
  `.trim()
  const expectedCleanTranscript = `
when we are about to do something
new
Eh after finishing
  `.trim()
  
  assert.strictEqual(cleanTranscript(transcript), expectedCleanTranscript)
})