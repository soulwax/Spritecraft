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
        body_type TEXT NOT NULL,
        animation TEXT NOT NULL,
        prompt TEXT NULL,
        selections JSONB NOT NULL,
        used_layers JSONB NOT NULL,
        credits JSONB NOT NULL
      )
    ''');
  }

  Future<StudioHistoryEntry> save({
    required LpcRenderRequest request,
    required LpcRenderResult renderResult,
  }) async {
    final Result result = await _connection.execute(
      Sql.named('''
        INSERT INTO sprite_history (
          id,
          body_type,
          animation,
          prompt,
          selections,
          used_layers,
          credits
        ) VALUES (
          @id:text,
          @bodyType:text,
          @animation:text,
          @prompt:text,
          @selections:jsonb,
          @usedLayers:jsonb,
          @credits:jsonb
        )
        RETURNING id, created_at, body_type, animation, prompt, selections, used_layers, credits
      '''),
      parameters: <String, Object?>{
        'id': _createId(),
        'bodyType': request.bodyType,
        'animation': request.animation,
        'prompt': request.prompt,
        'selections': request.selections,
        'usedLayers': renderResult.usedLayers
            .map((UsedLpcLayer layer) => layer.toJson())
            .toList(),
        'credits': renderResult.credits
            .map((LpcCreditRecord credit) => credit.toJson())
            .toList(),
      },
    );

    return _entryFromRow(result.first.toColumnMap());
  }

  Future<List<StudioHistoryEntry>> listRecent({int limit = 20}) async {
    final Result result = await _connection.execute(
      Sql.named('''
        SELECT id, created_at, body_type, animation, prompt, selections, used_layers, credits
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
        SELECT id, created_at, body_type, animation, prompt, selections, used_layers, credits
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
    final List<dynamic> layersList = _normalizeJsonList(row['used_layers']);
    final List<dynamic> creditsList = _normalizeJsonList(row['credits']);

    return StudioHistoryEntry(
      id: row['id'].toString(),
      createdAt: row['created_at'] as DateTime,
      bodyType: row['body_type'].toString(),
      animation: row['animation'].toString(),
      prompt: row['prompt']?.toString(),
      selections: selectionsMap.map(
        (String key, dynamic value) => MapEntry(key, value.toString()),
      ),
      usedLayers: layersList
          .whereType<Map<String, dynamic>>()
          .map(
            (Map<String, dynamic> json) => UsedLpcLayer(
              itemId: json['itemId'].toString(),
              itemName: json['itemName'].toString(),
              typeName: json['typeName'].toString(),
              variant: json['variant'].toString(),
              layerId: json['layerId'].toString(),
              zPos: (json['zPos'] as num?)?.toInt() ?? 0,
              assetPath: json['assetPath'].toString(),
            ),
          )
          .toList(),
      credits: creditsList
          .whereType<Map<String, dynamic>>()
          .map(LpcCreditRecord.fromJson)
          .toList(),
    );
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
