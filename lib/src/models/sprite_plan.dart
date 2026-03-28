// File: lib/src/models/sprite_plan.dart

class SpritePlan {
  const SpritePlan({
    required this.concept,
    required this.frameCount,
    required this.frameWidth,
    required this.frameHeight,
    required this.styleTags,
    required this.framePrompts,
  });

  final String concept;
  final int frameCount;
  final int frameWidth;
  final int frameHeight;
  final List<String> styleTags;
  final List<String> framePrompts;

  factory SpritePlan.fromJson(Map<String, dynamic> json) {
    return SpritePlan(
      concept: json['concept'] as String? ?? 'Untitled sprite plan',
      frameCount: json['frameCount'] as int? ?? 1,
      frameWidth: json['frameWidth'] as int? ?? 64,
      frameHeight: json['frameHeight'] as int? ?? 64,
      styleTags: (json['styleTags'] as List<dynamic>? ?? <dynamic>[])
          .map((dynamic value) => value.toString())
          .toList(),
      framePrompts: (json['framePrompts'] as List<dynamic>? ?? <dynamic>[])
          .map((dynamic value) => value.toString())
          .toList(),
    );
  }

  Map<String, Object> toJson() {
    return <String, Object>{
      'concept': concept,
      'frameCount': frameCount,
      'frameWidth': frameWidth,
      'frameHeight': frameHeight,
      'styleTags': styleTags,
      'framePrompts': framePrompts,
    };
  }
}
