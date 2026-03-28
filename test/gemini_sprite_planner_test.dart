// File: test/gemini_sprite_planner_test.dart

import 'package:spritecraft/spritesheet_creator.dart';
import 'package:test/test.dart';

void main() {
  group('GeminiSpritePlanner', () {
    test('parses fenced json from Gemini candidate text', () {
      final GeminiSpritePlanner planner = GeminiSpritePlanner(apiKey: 'test');

      final SpritePlan plan = planner.parsePlanResponse(<String, dynamic>{
        'candidates': <Object>[
          <String, Object>{
            'content': <String, Object>{
              'parts': <Object>[
                <String, String>{
                  'text': '''
```json
{
  "concept": "Forest slime",
  "frameCount": 6,
  "frameWidth": 64,
  "frameHeight": 64,
  "styleTags": ["pixel art", "forest"],
  "framePrompts": ["idle 1", "idle 2"]
}
```
''',
                },
              ],
            },
          },
        ],
      });

      expect(plan.concept, 'Forest slime');
      expect(plan.frameCount, 6);
      expect(plan.styleTags, contains('pixel art'));
    });
  });
}
