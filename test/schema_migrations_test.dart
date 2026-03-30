// File: test/schema_migrations_test.dart

import 'package:spritecraft/src/models/lpc_models.dart';
import 'package:test/test.dart';

void main() {
  group('SpriteCraftSchemaMigrations', () {
    test(
      'migrates older project-shaped records with missing modern fields',
      () {
        final Map<String, Object?> migrated =
            SpriteCraftSchemaMigrations.migrateProjectRecord(<String, dynamic>{
              'id': '123',
              'createdAt': '2026-03-28T10:00:00.000Z',
              'bodyType': 'female',
              'animation': 'walk',
              'prompt': 'Forest scout',
              'name': 'Scout Draft',
              'selections': <String, String>{'hood_green': 'default'},
            });

        expect(migrated['projectName'], 'Scout Draft');
        expect(migrated['enginePreset'], 'none');
        expect(migrated['renderSettings'], <String, Object?>{
          'previewMode': 'single',
          'category': 'all',
          'animationFilter': 'current',
          'tagFilter': 'all',
        });
        expect(migrated['promptHistory'], <String>['Forest scout']);
        expect(migrated['exportHistory'], isEmpty);
        expect(
          (migrated['schema'] as Map<String, Object>)['version'],
          kSpriteCraftProjectSchemaVersion,
        );
      },
    );

    test('StudioHistoryEntry.fromJson normalizes legacy payloads', () {
      final StudioHistoryEntry entry = StudioHistoryEntry.fromJson(
        <String, dynamic>{
          'id': 'legacy-1',
          'createdAt': '2026-03-28T10:00:00.000Z',
          'bodyType': 'male',
          'animation': 'idle',
          'prompt': 'Town guard',
          'selections': <String, String>{'helmet_guard': 'default'},
        },
      );

      expect(entry.projectName, 'Town guard');
      expect(
        entry.updatedAt.toUtc().toIso8601String(),
        startsWith('2026-03-28T10:00:00'),
      );
      expect(entry.renderSettings['previewMode'], 'single');
      expect(entry.promptHistory, <String>['Town guard']);
      expect(entry.exportHistory, isEmpty);
    });

    test('migrates older render metadata to the current schema', () {
      final Map<String, Object?> migrated =
          SpriteCraftSchemaMigrations.migrateRenderMetadata(<String, dynamic>{
            'image': <String, Object>{
              'path': 'hero.png',
              'width': 64,
              'height': 64,
            },
            'content': <String, Object?>{
              'bodyType': 'male',
              'animation': 'slash',
            },
          });

      expect(migrated['schema'], <String, Object>{
        'name': 'spritecraft.render',
        'version': kSpriteCraftRenderSchemaVersion,
      });
      expect(
        (migrated['content'] as Map<String, Object?>)['projectSchemaVersion'],
        kSpriteCraftProjectSchemaVersion,
      );
      expect(
        (migrated['content'] as Map<String, Object?>)['selections'],
        <String, dynamic>{},
      );
      expect(migrated['layers'], isEmpty);
      expect(migrated['credits'], isEmpty);
    });
  });
}
