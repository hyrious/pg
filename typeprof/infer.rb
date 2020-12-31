require 'typeprof'
require 'stringio'

output = StringIO.new
t = Time.new
TypeProf.analyze(TypeProf::ConfigData.new(
  rb_files: ['a.rb'],
  rbs_files: [],
  gem_rbs_features: [],
  output: output,
  options: {},
  verbose: 0,
))
puts output.string
p Time.new - t
