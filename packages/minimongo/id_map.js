LocalCollection._IdMap = function () {
  var self = this;
  IdMap.call(self, MongoId._idStringify, MongoId._idParse);
};

Meteor._inherits(LocalCollection._IdMap, IdMap);

