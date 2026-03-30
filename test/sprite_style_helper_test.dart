import 'package:spritecraft/spritesheet_creator.dart';
import 'package:test/test.dart';

void main() {
  group('SpriteStyleHelper', () {
    const LpcItemDefinition hood = LpcItemDefinition(
      id: 'hood-ranger',
      name: 'Ranger Hood',
      typeName: 'headwear',
      pathSegments: <String>['head'],
      priority: 1,
      requiredBodyTypes: <String>['male'],
      animations: <String>['idle', 'walk'],
      tags: <String>['ranger', 'hood'],
      variants: <String>['default'],
      matchBodyColor: false,
      layers: <LpcLayerDefinition>[],
      credits: <LpcCreditRecord>[],
    );

    const LpcItemDefinition torso = LpcItemDefinition(
      id: 'leather-torso',
      name: 'Leather Torso',
      typeName: 'torso',
      pathSegments: <String>['torso'],
      priority: 2,
      requiredBodyTypes: <String>['male'],
      animations: <String>['idle', 'walk'],
      tags: <String>['ranger', 'leather'],
      variants: <String>['default'],
      matchBodyColor: false,
      layers: <LpcLayerDefinition>[],
      credits: <LpcCreditRecord>[],
    );

    test('builds fallback style directions from prompt memory and staged items', () {
      final SpriteStyleHelper helper = SpriteStyleHelper();

      final SpriteStyleHelperResult result = helper.buildFallback(
        prompt: 'forest ranger with grounded travel gear',
        animation: 'idle',
        promptHistory: const <String>[
          'hooded ranger scout with leather layers',
        ],
        tags: const <String>['forest', 'ranger'],
        notes: 'Keep the palette earthy and practical.',
        stagedItems: const <LpcItemDefinition>[hood, torso],
      );

      expect(result.paletteDirections, isNotEmpty);
      expect(result.styleTags, isNotEmpty);
      expect(result.guidance, isNotEmpty);
      expect(result.focusQueries, isNotEmpty);
      expect(
        result.styleTags,
        anyElement(anyOf('forest', 'ranger', 'leather')),
      );
    });
  });
}
