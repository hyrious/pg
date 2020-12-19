def expand path
  path.gsub(/%\w+%/) { |match| ENV[match[1...-1]] }.tr("\\", ?/)
end

Prefix = expand %q'%AppData%\Sublime Text 3\Packages\Default'

def prefix *args
  File.join Prefix, *args
end

def load_file file
  raw = File.read file
  eval raw.gsub(/^\s*\/\/.*/, '')
end

@translation = {}

def scan_translation a
  case a
  when Hash
    if a[:command] and a[:caption]
      @translation[a[:command]] = a[:caption].sub(/\(.*/, '')
    end
    a[:children]&.each { |e| scan_translation e }
  when Array
    a.each { |e| scan_translation e }
  end
end

Dir.glob prefix '*.sublime-menu' do |file|
  scan_translation load_file file
end

keymap = load_file prefix 'Default (Windows).sublime-keymap'
puts "| 按键 | 作用 |"
puts "|-|-|"
keymap.each do |map|
  keys, command = map.values_at :keys, :command
  trans = @translation[command] || command
  puts "| #{keys.map { |e| "`#{e}`" }.join(?\s)} | #{trans} |"
end
