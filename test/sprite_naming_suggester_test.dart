import 'package:spritecraft/spritesheet_creator.dart';
import 'package:test/test.dart';

void main() {
  group('SpriteNamingSuggester', () {
    test('builds practical fallback naming suggestions', () {
      final SpriteNamingSuggester suggester = SpriteNamingSuggester();

      final SpriteNamingSuggestions suggestions = suggester
          .buildFallbackSuggestions(
            prompt: 'forest ranger with short bow and hood',
            animation: 'idle',
            promptHistory: const <String>[
              'hooded ranger scout in leather',
              'forest tracker with quiver',
            ],
            tags: const <String>['ranger', 'forest'],
            notes: 'Keep the naming grounded and practical.',
            selectionCount: 6,
          );

      expect(suggestions.projectNames, isNotEmpty);
      expect(suggestions.animationLabels, isNotEmpty);
      expect(suggestions.exportStems, isNotEmpty);
      expect(
        suggestions.projectNames.map((SpriteNameOption option) => option.value),
        anyElement(contains('Ranger')),
      );
      expect(
        suggestions.exportStems.every(
          (SpriteNameOption option) => !option.value.contains(' '),
        ),
        isTrue,
      );
    });
  });
}
