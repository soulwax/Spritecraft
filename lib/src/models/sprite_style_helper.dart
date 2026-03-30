class SpritePaletteDirection {
  const SpritePaletteDirection({
    required this.label,
    required this.swatches,
    required this.rationale,
  });

  final String label;
  final List<String> swatches;
  final String rationale;

  factory SpritePaletteDirection.fromJson(Map<String, dynamic> json) {
    return SpritePaletteDirection(
      label: json['label']?.toString() ?? '',
      swatches: (json['swatches'] as List<dynamic>? ?? <dynamic>[])
          .map((dynamic entry) => entry.toString())
          .toList(),
      rationale: json['rationale']?.toString() ?? '',
    );
  }

  Map<String, Object> toJson() {
    return <String, Object>{
      'label': label,
      'swatches': swatches,
      'rationale': rationale,
    };
  }
}

class SpriteStyleHelperResult {
  const SpriteStyleHelperResult({
    required this.summary,
    required this.paletteDirections,
    required this.styleTags,
    required this.guidance,
    required this.focusQueries,
  });

  final String summary;
  final List<SpritePaletteDirection> paletteDirections;
  final List<String> styleTags;
  final List<String> guidance;
  final List<String> focusQueries;

  factory SpriteStyleHelperResult.fromJson(Map<String, dynamic> json) {
    return SpriteStyleHelperResult(
      summary: json['summary']?.toString() ?? '',
      paletteDirections:
          (json['paletteDirections'] as List<dynamic>? ?? <dynamic>[])
              .whereType<Map<String, dynamic>>()
              .map(SpritePaletteDirection.fromJson)
              .toList(),
      styleTags: (json['styleTags'] as List<dynamic>? ?? <dynamic>[])
          .map((dynamic entry) => entry.toString())
          .toList(),
      guidance: (json['guidance'] as List<dynamic>? ?? <dynamic>[])
          .map((dynamic entry) => entry.toString())
          .toList(),
      focusQueries: (json['focusQueries'] as List<dynamic>? ?? <dynamic>[])
          .map((dynamic entry) => entry.toString())
          .toList(),
    );
  }

  Map<String, Object> toJson() {
    return <String, Object>{
      'summary': summary,
      'paletteDirections': paletteDirections
          .map((SpritePaletteDirection entry) => entry.toJson())
          .toList(),
      'styleTags': styleTags,
      'guidance': guidance,
      'focusQueries': focusQueries,
    };
  }
}
