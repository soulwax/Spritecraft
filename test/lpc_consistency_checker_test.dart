import 'package:spritecraft/spritesheet_creator.dart';
import 'package:test/test.dart';

void main() {
  group('LpcConsistencyChecker', () {
    const LpcItemDefinition hood = LpcItemDefinition(
      id: 'hood-ranger',
      name: 'Ranger Hood',
      typeName: 'headwear',
      pathSegments: <String>['head'],
      priority: 1,
      requiredBodyTypes: <String>['male'],
      animations: <String>['idle'],
      tags: <String>['ranger', 'hood'],
      variants: <String>['default'],
      matchBodyColor: false,
      layers: <LpcLayerDefinition>[],
      credits: <LpcCreditRecord>[],
    );

    const LpcItemDefinition scarf = LpcItemDefinition(
      id: 'scarf-trim',
      name: 'Scarf Trim',
      typeName: 'headwear',
      pathSegments: <String>['accessories'],
      priority: 2,
      requiredBodyTypes: <String>['male'],
      animations: <String>['idle', 'walk'],
      tags: <String>['trim'],
      variants: <String>['default'],
      matchBodyColor: false,
      layers: <LpcLayerDefinition>[],
      credits: <LpcCreditRecord>[],
    );

    const LpcItemDefinition bodyMatchCape = LpcItemDefinition(
      id: 'cape-body-match',
      name: 'Body Match Cape',
      typeName: 'cape',
      pathSegments: <String>['accessories'],
      priority: 3,
      requiredBodyTypes: <String>['male'],
      animations: <String>['idle'],
      tags: <String>['cape'],
      variants: <String>['default'],
      matchBodyColor: true,
      layers: <LpcLayerDefinition>[],
      credits: <LpcCreditRecord>[],
    );

    final LpcCatalog catalog = LpcCatalog(
      itemsById: <String, LpcItemDefinition>{
        hood.id: hood,
        scarf.id: scarf,
        bodyMatchCape.id: bodyMatchCape,
      },
      bodyTypes: const <String>['male', 'female'],
      animations: const <String>['idle', 'walk'],
    );

    test('reports duplicate types, body-color anchor gaps, and animation gaps', () {
      final LpcConsistencyChecker checker = LpcConsistencyChecker(
        catalog: catalog,
      );

      final LpcConsistencyReport report = checker.analyze(
        const LpcRenderRequest(
          bodyType: 'male',
          animation: 'walk',
          selections: <String, String>{
            'hood-ranger': 'default',
            'scarf-trim': 'default',
            'cape-body-match': 'default',
          },
          prompt: 'forest ranger',
        ),
      );

      expect(report.issues, isNotEmpty);
      expect(
        report.issues.map((LpcConsistencyIssue issue) => issue.code),
        containsAll(<String>[
          'duplicate-layer-type',
          'body-color-anchor-missing',
          'incomplete-animation-support',
        ]),
      );
      expect(report.hasBlockingIssues, isFalse);
    });
  });
}
