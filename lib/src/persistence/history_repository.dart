// File: lib/src/persistence/history_repository.dart

import 'dart:convert';

import 'package:postgres/postgres.dart';

import '../models/lpc_models.dart';

class HistoryRepository {
  HistoryRepository._(this._connection);

  final Connection _connection;

  static Future<HistoryRepository?> connect(String databaseUrl) async {
    if (databaseUrl.isEmpty) {
      return null;
    }

    final Connection connection = await Connection.openFromUrl(
      _sanitizeDatabaseUrl(databaseUrl),
    );
    final HistoryRepository repository = HistoryRepository._(connection);
    await repository.initialize();
    return repository;
  }

  Future<void> initialize() async {
    await _connection.execute('''
      CREATE TABLE IF NOT EXISTS sprite_history (
        id TEXT PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        body_type TEXT NOT NULL,
        animation TEXT NOT NULL,
        prompt TEXT NULL,
        project_name TEXT NULL,
        notes TEXT NULL,
        engine_preset TEXT NULL,
        tags JSONB NOT NULL DEFAULT '[]'::jsonb,
        selections JSONB NOT NULL,
        render_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
        export_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
        prompt_history JSONB NOT NULL DEFAULT '[]'::jsonb,
        export_history JSONB NOT NULL DEFAULT '[]'::jsonb,
        used_layers JSONB NOT NULL,
        credits JSONB NOT NULL
      )
    ''');
    await _connection.execute('''
      ALTER TABLE sprite_history
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    ''');
    await _connection.execute('''
      ALTER TABLE sprite_history
      ADD COLUMN IF NOT EXISTS project_name TEXT NULL
    ''');
    await _connection.execute('''
      ALTER TABLE sprite_history
      ADD COLUMN IF NOT EXISTS notes TEXT NULL
    ''');
    await _connection.execute('''
      ALTER TABLE sprite_history
      ADD COLUMN IF NOT EXISTS engine_preset TEXT NULL
    ''');
    await _connection.execute('''
      ALTER TABLE sprite_history
      ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]'::jsonb
    ''');
    await _connection.execute('''
      ALTER TABLE sprite_history
      ADD COLUMN IF NOT EXISTS render_settings JSONB NOT NULL DEFAULT '{}'::jsonb
    ''');
    await _connection.execute('''
      ALTER TABLE sprite_history
      ADD COLUMN IF NOT EXISTS export_settings JSONB NOT NULL DEFAULT '{}'::jsonb
    ''');
    await _connection.execute('''
      ALTER TABLE sprite_history
      ADD COLUMN IF NOT EXISTS prompt_history JSONB NOT NULL DEFAULT '[]'::jsonb
    ''');
    await _connection.execute('''
      ALTER TABLE sprite_history
      ADD COLUMN IF NOT EXISTS export_history JSONB NOT NULL DEFAULT '[]'::jsonb
    ''');
  }

  Future<StudioHistoryEntry> save({
    required LpcRenderRequest request,
    required LpcRenderResult renderResult,
    Map<String, Object?> details = const <String, Object?>{},
  }) async {
    return _insertHistoryRow(
      parameters: <String, Object?>{
        'id': _createId(),
        'updatedAt': DateTime.now().toUtc(),
        'bodyType': request.bodyType,
        'animation': request.animation,
        'prompt': request.prompt,
        'projectName': details['projectName']?.toString(),
        'notes': details['notes']?.toString(),
        'enginePreset': details['enginePreset']?.toString(),
        'tags': details['tags'] ?? <String>[],
        'selections': request.selections,
        'renderSettings': details['renderSettings'] ?? <String, Object?>{},
        'exportSettings': details['exportSettings'] ?? <String, Object?>{},
        'promptHistory': details['promptHistory'] ?? <String>[],
        'exportHistory': details['exportHistory'] ?? <Map<String, Object?>>[],
        'usedLayers': renderResult.usedLayers
            .map((UsedLpcLayer layer) => layer.toJson())
            .toList(),
        'credits': renderResult.credits
            .map((LpcCreditRecord credit) => credit.toJson())
            .toList(),
      },
    );
  }

  Future<StudioHistoryEntry?> duplicate(String id) async {
    final StudioHistoryEntry? entry = await findById(id);
    if (entry == null) {
      return null;
    }

    return importEntry(
      entry,
      projectNameOverride: '${entry.projectName ?? entry.prompt ?? 'Project'} Copy',
    );
  }

  Future<StudioHistoryEntry> importEntry(
    StudioHistoryEntry entry, {
    String? projectNameOverride,
  }) async {
    return _insertHistoryRow(
      parameters: <String, Object?>{
        'id': _createId(),
        'updatedAt': DateTime.now().toUtc(),
        'bodyType': entry.bodyType,
        'animation': entry.animation,
        'prompt': entry.prompt,
        'projectName': projectNameOverride ?? entry.projectName,
        'notes': entry.notes,
        'enginePreset': entry.enginePreset,
        'tags': entry.tags,
        'selections': entry.selections,
        'renderSettings': entry.renderSettings,
        'exportSettings': entry.exportSettings,
        'promptHistory': entry.promptHistory,
        'exportHistory': entry.exportHistory,
        'usedLayers': entry.usedLayers
            .map((UsedLpcLayer layer) => layer.toJson())
            .toList(),
        'credits': entry.credits
            .map((LpcCreditRecord credit) => credit.toJson())
            .toList(),
      },
    );
  }

  Future<StudioHistoryEntry> _insertHistoryRow({
    required Map<String, Object?> parameters,
  }) async {
    final Result result = await _connection.execute(
      Sql.named('''
        INSERT INTO sprite_history (
          id,
          updated_at,
          body_type,
          animation,
          prompt,
          project_name,
          notes,
          engine_preset,
          tags,
          selections,
          render_settings,
          export_settings,
          prompt_history,
          export_history,
          used_layers,
          credits
        ) VALUES (
          @id:text,
          @updatedAt:timestamptz,
          @bodyType:text,
          @animation:text,
          @prompt:text,
          @projectName:text,
          @notes:text,
          @enginePreset:text,
          @tags:jsonb,
          @selections:jsonb,
          @renderSettings:jsonb,
          @exportSettings:jsonb,
          @promptHistory:jsonb,
          @exportHistory:jsonb,
          @usedLayers:jsonb,
          @credits:jsonb
        )
        RETURNING id, created_at, updated_at, body_type, animation, prompt, project_name, notes, engine_preset, tags, selections, render_settings, export_settings, prompt_history, export_history, used_layers, credits
      '''),
      parameters: parameters,
    );

    return _entryFromRow(result.first.toColumnMap());
  }

  Future<List<StudioHistoryEntry>> listRecent({int limit = 20}) async {
    final Result result = await _connection.execute(
      Sql.named('''
        SELECT id, created_at, updated_at, body_type, animation, prompt, project_name, notes, engine_preset, tags, selections, render_settings, export_settings, prompt_history, export_history, used_layers, credits
        FROM sprite_history
        ORDER BY created_at DESC
        LIMIT @limit:int4
      '''),
      parameters: <String, Object>{'limit': limit},
    );

    return result
        .map((ResultRow row) => _entryFromRow(row.toColumnMap()))
        .toList();
  }

  Future<StudioHistoryEntry?> findById(String id) async {
    final Result result = await _connection.execute(
      Sql.named('''
        SELECT id, created_at, updated_at, body_type, animation, prompt, project_name, notes, engine_preset, tags, selections, render_settings, export_settings, prompt_history, export_history, used_layers, credits
        FROM sprite_history
        WHERE id = @id:text
        LIMIT 1
      '''),
      parameters: <String, Object>{'id': id},
    );

    if (result.isEmpty) {
      return null;
    }
    return _entryFromRow(result.first.toColumnMap());
  }

  Future<bool> delete(String id) async {
    final Result result = await _connection.execute(
      Sql.named(
        'DELETE FROM sprite_history WHERE id = @id:text',
      ),
      parameters: <String, Object>{'id': id},
    );
    return result.affectedRows > 0;
  }

  StudioHistoryEntry _entryFromRow(Map<String, dynamic> row) {
    final Map<String, dynamic> selectionsMap =
        _normalizeJsonMap(row['selections']) ?? <String, dynamic>{};
    final Map<String, dynamic> renderSettingsMap =
        _normalizeJsonMap(row['render_settings']) ?? <String, dynamic>{};
    final Map<String, dynamic> exportSettingsMap =
        _normalizeJsonMap(row['export_settings']) ?? <String, dynamic>{};
    final List<dynamic> tagsList = _normalizeJsonList(row['tags']);
    final List<dynamic> promptHistoryList = _normalizeJsonList(
      row['prompt_history'],
    );
    final List<dynamic> exportHistoryList = _normalizeJsonList(
      row['export_history'],
    );
    final List<dynamic> layersList = _normalizeJsonList(row['used_layers']);
    final List<dynamic> creditsList = _normalizeJsonList(row['credits']);

    return StudioHistoryEntry.fromJson(<String, dynamic>{
      'id': row['id'].toString(),
      'createdAt': (row['created_at'] as DateTime).toIso8601String(),
      'updatedAt': ((row['updated_at'] as DateTime?) ?? row['created_at'] as DateTime)
          .toIso8601String(),
      'bodyType': row['body_type'].toString(),
      'animation': row['animation'].toString(),
      'prompt': row['prompt']?.toString(),
      'projectName': row['project_name']?.toString(),
      'notes': row['notes']?.toString(),
      'enginePreset': row['engine_preset']?.toString(),
      'tags': tagsList,
      'selections': selectionsMap,
      'renderSettings': renderSettingsMap,
      'exportSettings': exportSettingsMap,
      'promptHistory': promptHistoryList,
      'exportHistory': exportHistoryList,
      'usedLayers': layersList,
      'credits': creditsList,
    });
  }

  Map<String, dynamic>? _normalizeJsonMap(dynamic value) {
    if (value is Map<String, dynamic>) {
      return value;
    }
    if (value is String && value.isNotEmpty) {
      return jsonDecode(value) as Map<String, dynamic>;
    }
    return null;
  }

  List<dynamic> _normalizeJsonList(dynamic value) {
    if (value is List<dynamic>) {
      return value;
    }
    if (value is String && value.isNotEmpty) {
      return jsonDecode(value) as List<dynamic>;
    }
    return <dynamic>[];
  }

  String _createId() =>
      DateTime.now().toUtc().microsecondsSinceEpoch.toString();

  Future<void> close() => _connection.close();

  static String _sanitizeDatabaseUrl(String databaseUrl) {
    final Uri uri = Uri.parse(databaseUrl);
    final Map<String, String> sanitized = Map<String, String>.from(
      uri.queryParameters,
    )..remove('channel_binding');
    return uri.replace(queryParameters: sanitized).toString();
  }
}
