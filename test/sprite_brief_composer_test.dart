import 'package:spritecraft/spritesheet_creator.dart';
import 'package:test/test.dart';

void main() {
  group('SpriteBriefComposer', () {
    const LpcItemDefinition body = LpcItemDefinition(
      id: 'body-base',
      name: 'Body Base',
      typeName: 'body',
      pathSegments: <String>['body'],
      priority: 1,
      requiredBodyTypes: <String>['male'],
      animations: <String>['idle', 'walk'],
      tags: <String>['base'],
      variants: <String>['light'],
      matchBodyColor: true,
      layers: <LpcLayerDefinition>[],
      credits: <LpcCreditRecord>[],
    );

    const LpcItemDefinition hood = LpcItemDefinition(
      id: 'hood-ranger',
      name: 'Ranger Hood',
      typeName: 'headwear',
      pathSegments: <String>['head'],
      priority: 2,
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

    const LpcItemDefinition bow = LpcItemDefinition(
      id: 'short-bow',
      name: 'Short Bow',
      typeName: 'weapon',
      pathSegments: <String>['weapons'],
      priority: 3,
      requiredBodyTypes: <String>['male'],
      animations: <String>['idle', 'walk'],
      tags: <String>['ranger', 'bow'],
      variants: <String>['default'],
      matchBodyColor: false,
      layers: <LpcLayerDefinition>[],
      credits: <LpcCreditRecord>[],
    );

    final LpcCatalog catalog = LpcCatalog(
      itemsById: <String, LpcItemDefinition>{
        body.id: body,
        hood.id: hood,
        torso.id: torso,
        bow.id: bow,
      },
      bodyTypes: const <String>['male'],
      animations: const <String>['idle', 'walk'],
    );

    test('builds fallback guide steps when Gemini plan is absent', () {
      final SpriteBriefComposer composer = SpriteBriefComposer(
        catalog: catalog,
      );

      final SpritePlan plan = composer.normalizePlan(
        plan: null,
        prompt: 'forest ranger with bow',
        bodyType: 'male',
        animation: 'idle',
      );
      final List<SpriteBriefGuideStep> steps = composer.buildGuideSteps(
        plan: plan,
        prompt: 'forest ranger with bow',
        bodyType: 'male',
        animation: 'idle',
      );
      final List<SpriteBriefCategorySuggestion> categorySuggestions = composer
          .buildCategorySuggestions(steps);
      final SpriteBriefCandidateBuild candidateBuild = composer
          .buildCandidateBuild(plan: plan, steps: steps);

      expect(plan.buildPath, isNotEmpty);
      expect(steps, isNotEmpty);
      expect(categorySuggestions, isNotEmpty);
      expect(candidateBuild.selections, isNotEmpty);
      expect(
        steps.any(
          (SpriteBriefGuideStep step) => step.recommendations.isNotEmpty,
        ),
        isTrue,
      );
      expect(
        composer
            .collectTopRecommendations(steps)
            .map((LpcItemDefinition item) => item.id),
        contains('short-bow'),
      );
    });
  });
}
