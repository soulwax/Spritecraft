// File: test/metadata_schema_test.dart

import 'package:spritecraft/spritesheet_creator.dart';
import 'package:test/test.dart';

void main() {
  test('metadata schema constants stay on the documented stable versions', () {
    expect(kSpriteCraftSpritesheetSchemaName, 'spritecraft.spritesheet');
    expect(kSpriteCraftSpritesheetSchemaVersion, 1);

    expect(kSpriteCraftRenderSchemaName, 'spritecraft.render');
    expect(kSpriteCraftRenderSchemaVersion, 2);

    expect(kSpriteCraftProjectSchemaName, 'spritecraft.project');
    expect(kSpriteCraftProjectSchemaVersion, 2);
  });
}
