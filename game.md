## Game dynamics

Words between '' are emitted socket events


Client | Server | Solo | Squad | Team
-|-
('search', type)|push user in matchmaker, and then ('new_game', {_id,type})|||
('join', _id)|('start_game', {_id,type,side0:[{_id,username,picture,rating,uni,country,major}],side1:[]})|||game.teams = {_id,name,picture}
|after START_TIMEOUT ('question',{question,answers: [],})|||
('answer',{_id,answer},cb(correct))|add {question: _id,answer,time} to game.players | | ('mate_answer',{_id: user,answer,})
