
def ask_before_run cmd
  print %{exec "#{cmd}" ? [Y/n] \e[s}
  return if gets.strip.downcase == 'n'
  puts %{\e[uyes\n> #{cmd}}
  system cmd
end

def sh cmd
  puts "> #{cmd}"
  system cmd
end

sh 'git add .'
sh 'git status --short'
sh 'git commit --amend --no-edit'
sh 'git push --force-with-lease'
